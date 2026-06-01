const HIGH = "high";
const MEDIUM = "medium";
const LOW = "low";

function asArray(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value;
}

function asNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function asDate(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError(`${field} must be a valid date`);
  }
  return date;
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeTeam(team) {
  return {
    id: asNonEmptyString(team.id, "team.id"),
    status: team.status || "eligible",
    timezone: team.timezone || "UTC",
    channels: unique(asArray(team.channels || [], "team.channels").map(String)),
    accessibilityNeeds: unique(
      asArray(team.accessibilityNeeds || [], "team.accessibilityNeeds").map(String)
    ),
  };
}

function normalizeAttachment(attachment) {
  return {
    id: asNonEmptyString(attachment.id, "attachment.id"),
    required: Boolean(attachment.required),
    accessibleFormats: unique(
      asArray(attachment.accessibleFormats || [], "attachment.accessibleFormats").map(String)
    ),
    digest: attachment.digest ? String(attachment.digest) : "",
  };
}

function normalizeCommunication(event) {
  return {
    id: asNonEmptyString(event.id, "communication.id"),
    phase: asNonEmptyString(event.phase, "communication.phase"),
    material: Boolean(event.material),
    topic: asNonEmptyString(event.topic, "communication.topic"),
    sentAt: asDate(event.sentAt, "communication.sentAt").toISOString(),
    audience: unique(asArray(event.audience || [], "communication.audience").map(String)),
    channels: unique(asArray(event.channels || [], "communication.channels").map(String)),
    ruleDigest: event.ruleDigest ? String(event.ruleDigest) : "",
    ackDeadlineHours: Number(event.ackDeadlineHours || 0),
    acknowledgements: event.acknowledgements || {},
    attachments: asArray(event.attachments || [], "communication.attachments").map(normalizeAttachment),
  };
}

function normalizeChallenge(challenge) {
  return {
    challengeId: asNonEmptyString(challenge.challengeId, "challengeId"),
    title: asNonEmptyString(challenge.title, "title"),
    currentRuleDigest: asNonEmptyString(challenge.currentRuleDigest, "currentRuleDigest"),
    clockStartsAt: challenge.clockStartsAt
      ? asDate(challenge.clockStartsAt, "clockStartsAt").toISOString()
      : null,
    teams: asArray(challenge.teams || [], "teams").map(normalizeTeam),
    communications: asArray(challenge.communications || [], "communications").map(
      normalizeCommunication
    ),
  };
}

function finding(code, severity, event, message, teams, remediation) {
  return {
    code,
    severity,
    communicationId: event.id,
    phase: event.phase,
    topic: event.topic,
    affectedTeams: teams,
    message,
    remediation,
  };
}

function eligibleTeams(challenge) {
  return challenge.teams.filter((team) => team.status === "eligible");
}

function assessCommunicationParity(rawChallenge) {
  const challenge = normalizeChallenge(rawChallenge);
  const eligible = eligibleTeams(challenge);
  const eligibleIds = eligible.map((team) => team.id);
  const teamById = new Map(eligible.map((team) => [team.id, team]));
  const findings = [];

  for (const event of challenge.communications) {
    const missingAudience = eligibleIds.filter((teamId) => !event.audience.includes(teamId));
    if (event.material && missingAudience.length > 0) {
      findings.push(
        finding(
          "MATERIAL_AUDIENCE_GAP",
          HIGH,
          event,
          "Material sponsor communication was not broadcast to every eligible solver team.",
          missingAudience,
          "Rebroadcast the exact message to all eligible teams and pause downstream decisions until receipt is logged."
        )
      );
    }

    const privateMaterialHint = event.material && event.audience.length > 0 && event.audience.length < eligibleIds.length;
    if (privateMaterialHint) {
      findings.push(
        finding(
          "PRIVATE_MATERIAL_HINT",
          HIGH,
          event,
          "A material hint or rule-affecting message reached only a subset of teams.",
          event.audience,
          "Publish an immutable public clarification digest and reset any affected timing windows."
        )
      );
    }

    if (event.material && event.ruleDigest !== challenge.currentRuleDigest) {
      findings.push(
        finding(
          "STALE_RULE_DIGEST",
          MEDIUM,
          event,
          "Material communication references an outdated rule digest.",
          event.audience,
          "Attach the current rules digest before submissions, scoring, or payout routing continue."
        )
      );
    }

    const teamsWithoutChannel = event.audience.filter((teamId) => {
      const team = teamById.get(teamId);
      return team && !event.channels.some((channel) => team.channels.includes(channel));
    });
    if (teamsWithoutChannel.length > 0) {
      findings.push(
        finding(
          "CHANNEL_COVERAGE_GAP",
          MEDIUM,
          event,
          "At least one recipient team lacks a verified delivery channel for this communication.",
          teamsWithoutChannel,
          "Send through a channel registered for every recipient or collect a verified alternate channel."
        )
      );
    }

    for (const attachment of event.attachments.filter((item) => item.required)) {
      const inaccessibleTeams = event.audience.filter((teamId) => {
        const team = teamById.get(teamId);
        if (!team || team.accessibilityNeeds.length === 0) {
          return false;
        }
        return !team.accessibilityNeeds.every((need) => attachment.accessibleFormats.includes(need));
      });
      if (inaccessibleTeams.length > 0) {
        findings.push(
          finding(
            "ACCESSIBLE_ATTACHMENT_GAP",
            MEDIUM,
            event,
            `Required attachment ${attachment.id} does not cover recipient accessibility needs.`,
            inaccessibleTeams,
            "Add accessible equivalents and resend the attachment before the acknowledgement clock runs."
          )
        );
      }
    }

    if (event.material && event.ackDeadlineHours > 0 && event.ackDeadlineHours < 24) {
      findings.push(
        finding(
          "UNFAIR_ACK_WINDOW",
          LOW,
          event,
          "Acknowledgement window is too short for timezone-safe team parity.",
          event.audience,
          "Use at least a 24 hour window for material communications unless every team explicitly waives it."
        )
      );
    }

    const missingAcknowledgements = event.material
      ? event.audience.filter((teamId) => !event.acknowledgements[teamId])
      : [];
    if (missingAcknowledgements.length > 0) {
      findings.push(
        finding(
          "MISSING_ACKNOWLEDGEMENT",
          MEDIUM,
          event,
          "Material communication lacks acknowledgement from one or more recipient teams.",
          missingAcknowledgements,
          "Hold phase transitions until acknowledgement or documented delivery fallback is present."
        )
      );
    }
  }

  const highCount = findings.filter((item) => item.severity === HIGH).length;
  const mediumCount = findings.filter((item) => item.severity === MEDIUM).length;
  const decision = highCount > 0 ? "hold" : mediumCount > 0 ? "revise" : "release";

  return {
    challengeId: challenge.challengeId,
    title: challenge.title,
    decision,
    summary: {
      eligibleTeams: eligibleIds.length,
      communicationsReviewed: challenge.communications.length,
      findings: findings.length,
      high: highCount,
      medium: mediumCount,
      low: findings.filter((item) => item.severity === LOW).length,
    },
    findings,
    releaseCriteria: [
      "Every material sponsor communication reaches all eligible solver teams.",
      "Rule-affecting messages reference the current immutable rule digest.",
      "Delivery channels and required attachments are accessible to each recipient.",
      "Material acknowledgements use fair windows and are logged before phase transitions.",
    ],
  };
}

module.exports = {
  assessCommunicationParity,
  normalizeChallenge,
};
