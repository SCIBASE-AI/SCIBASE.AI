"use strict";

const crypto = require("node:crypto");

const DEFAULT_ALLOWED_TARGETS = new Set([
  "winner",
  "finalist",
  "non_winner",
  "solver_team",
  "sponsor",
  "public_summary"
]);

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];

const ACTIONABLE_PATTERN =
  /\b(add|cite|clarify|compare|document|explain|include|improve|keep|maintain|measure|next|provide|quantify|remove|rerun|revise|separate|show|should|validate)\b/i;

const PAYMENT_PATTERN =
  /\b(paypal|venmo|cash\s*app|wire\s+transfer|crypto\s+wallet|off[-\s]?platform|direct\s+payment|negotiate\s+(?:payment|payout|reward)|message\s+the\s+sponsor\s+for\s+payment|split\s+the\s+bounty)\b/i;

const CIVILITY_PATTERN =
  /\b(fraud|fraudulent|dishonest|incompetent|lazy|plagiar(?:ism|ized)|scam|stolen)\b/i;

function evaluateDebriefPacket(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateDebriefPacket expects a packet object");
  }

  const minCommentWords = options.minCommentWords ?? 14;
  const maxCoverageVariance = options.maxCoverageVariance ?? 1;
  const now = options.now ?? new Date().toISOString();
  const findings = [];
  const challenge = isPlainObject(packet.challenge) ? packet.challenge : {};
  const rubricItems = asArray(packet.rubricItems ?? challenge.rubricItems);
  const debriefs = asArray(packet.debriefs);
  const teams = asArray(packet.teams);
  const teamById = new Map(teams.map((team) => [String(team.id), team]));
  const reviewerTerms = collectReviewerTerms(packet.reviewers);
  const privateTerms = collectPrivateTerms(packet, challenge);
  const allowedTargets = new Set([
    ...DEFAULT_ALLOWED_TARGETS,
    ...asArray(packet.allowedReleaseTargets),
    ...asArray(challenge.allowedReleaseTargets)
  ]);
  const expectedAppealDeadline =
    packet.appealDeadline ??
    challenge.appealDeadline ??
    (isPlainObject(challenge.appealPolicy) ? challenge.appealPolicy.deadline : undefined);

  if (!challenge.id || !challenge.title) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_CHALLENGE",
        "high",
        "Debrief packet is missing a challenge id or title.",
        "Challenge metadata anchors the release record and appeal clock.",
        "challenge",
        "Include stable challenge metadata before preparing solver-facing debriefs."
      )
    );
  }

  if (rubricItems.length === 0) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_RUBRIC",
        "high",
        "Debrief packet has no rubric items.",
        "Solver feedback cannot be checked for equal rubric coverage.",
        "rubricItems",
        "Attach the accepted challenge rubric before releasing feedback."
      )
    );
  }

  if (debriefs.length === 0) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_DEBRIEFS",
        "high",
        "Debrief packet has no team debriefs.",
        "There is nothing safe to release.",
        "debriefs",
        "Generate at least one solver-facing debrief before running the release guard."
      )
    );
  }

  const rubricIds = rubricItems.map((item) => String(item.id));
  const rubricIdSet = new Set(rubricIds);
  const perDebriefCoverage = [];

  debriefs.forEach((debrief, index) => {
    const path = `debriefs[${index}]`;
    const teamId = String(debrief.teamId ?? "");
    const team = teamById.get(teamId);
    const target = String(debrief.releaseTarget ?? "solver_team");
    const feedback = asArray(debrief.feedback ?? debrief.rubricFeedback);
    const feedbackIds = feedback.map((entry) => String(entry.rubricId));
    const feedbackIdSet = new Set(feedbackIds);
    const text = debriefReleaseText(debrief);

    if (!team) {
      findings.push(
        finding(
          "UNKNOWN_TEAM",
          "high",
          `Debrief references an unknown team id: ${teamId || "(missing)"}.`,
          "Unknown team records can route feedback to the wrong solver.",
          `${path}.teamId`,
          "Bind every debrief to a known solver team before release."
        )
      );
    }

    if (!allowedTargets.has(target)) {
      findings.push(
        finding(
          "UNKNOWN_RELEASE_TARGET",
          "high",
          `Debrief uses an unsupported release target: ${target}.`,
          "Unrecognized targets make it unclear who may receive the packet.",
          `${path}.releaseTarget`,
          "Use one of the approved release targets or add a reviewed target to the challenge policy."
        )
      );
    }

    const missingRubricIds = rubricIds.filter((id) => !feedbackIdSet.has(id));
    const extraRubricIds = feedbackIds.filter((id) => !rubricIdSet.has(id));

    if (missingRubricIds.length > 0) {
      findings.push(
        finding(
          "MISSING_RUBRIC_FEEDBACK",
          "high",
          `Debrief for ${teamId || "an unknown team"} is missing rubric feedback: ${missingRubricIds.join(", ")}.`,
          "All solver teams should receive feedback tied to the same accepted rubric.",
          `${path}.feedback`,
          "Add solver-facing comments for every accepted rubric item."
        )
      );
    }

    if (extraRubricIds.length > 0) {
      findings.push(
        finding(
          "EXTRA_RUBRIC_FEEDBACK",
          "warning",
          `Debrief for ${teamId || "an unknown team"} references unknown rubric ids: ${extraRubricIds.join(", ")}.`,
          "Unknown rubric ids can confuse appeals and downstream audit trails.",
          `${path}.feedback`,
          "Remove unknown rubric ids or formally add them through the challenge amendment process."
        )
      );
    }

    feedback.forEach((entry, feedbackIndex) => {
      const comment = String(entry.comment ?? entry.recommendation ?? "");
      const words = countWords(comment);
      if (words < minCommentWords || !ACTIONABLE_PATTERN.test(comment)) {
        findings.push(
          finding(
            "THIN_OR_NON_ACTIONABLE_FEEDBACK",
            "warning",
            `Feedback for rubric ${entry.rubricId ?? "(missing)"} is too thin or lacks a next action.`,
            `Detected ${words} words and ${ACTIONABLE_PATTERN.test(comment) ? "an" : "no"} actionable verb.`,
            `${path}.feedback[${feedbackIndex}].comment`,
            "Give the solver concrete, rubric-linked changes or evidence to preserve."
          )
        );
      }
    });

    if (expectedAppealDeadline && debrief.appealDeadline !== expectedAppealDeadline) {
      findings.push(
        finding(
          "APPEAL_DEADLINE_MISMATCH",
          "high",
          `Debrief appeal deadline differs from the challenge policy for ${teamId || "an unknown team"}.`,
          `Expected ${expectedAppealDeadline}; found ${debrief.appealDeadline ?? "(missing)"}.`,
          `${path}.appealDeadline`,
          "Synchronize the debrief appeal deadline with the accepted challenge policy."
        )
      );
    }

    matchTerms(text, privateTerms).forEach((term) => {
      findings.push(
        finding(
          "PRIVATE_BENCHMARK_LEAK",
          "critical",
          `Debrief exposes private benchmark or holdout label: ${term}.`,
          "Private benchmark names can leak sponsor evaluation data and bias future attempts.",
          path,
          "Replace private benchmark names with public rubric language before release."
        )
      );
    });

    matchTerms(text, reviewerTerms).forEach((term) => {
      findings.push(
        finding(
          "REVIEWER_ANONYMITY_LEAK",
          "critical",
          `Debrief exposes reviewer identity material: ${term}.`,
          "Reviewer identity disclosure can compromise anonymous review and invite retaliation.",
          path,
          "Remove reviewer names, emails, aliases, and identity hints from solver-facing text."
        )
      );
    });

    collectOtherTeamTerms(teams, teamId).forEach((term) => {
      if (containsTerm(text, term)) {
        findings.push(
          finding(
            "OTHER_TEAM_IP_LEAK",
            "critical",
            `Debrief references another team's protected submission material: ${term}.`,
            "Solver feedback must not disclose another team's private methods, artifacts, or trade secrets.",
            path,
            "Rewrite the feedback using only the recipient team's public rubric outcome."
          )
        );
      }
    });

    if (PAYMENT_PATTERN.test(text)) {
      findings.push(
        finding(
          "PAYMENT_NEGOTIATION_LANGUAGE",
          "critical",
          "Debrief includes direct payment or off-platform payout language.",
          "Solver debriefs should not alter escrow, bounty, or payment routing terms.",
          path,
          "Remove payment negotiation language and keep payout questions in the approved bounty platform."
        )
      );
    }

    if (CIVILITY_PATTERN.test(text)) {
      findings.push(
        finding(
          "CIVILITY_OR_DEFAMATION_RISK",
          "high",
          "Debrief contains accusatory or uncivil language.",
          "Unsafe phrasing can escalate disputes and create avoidable defamation risk.",
          path,
          "Use evidence-based rubric language and avoid character judgments."
        )
      );
    }

    perDebriefCoverage.push({
      teamId,
      releaseTarget: target,
      feedbackCount: feedback.length,
      missingRubricIds,
      extraRubricIds
    });
  });

  teams.forEach((team) => {
    const hasDebrief = debriefs.some((debrief) => String(debrief.teamId) === String(team.id));
    if (!hasDebrief) {
      findings.push(
        finding(
          "MISSING_TEAM_DEBRIEF",
          "high",
          `Team ${team.id} has no debrief in the packet.`,
          "A solver team without feedback cannot understand the outcome or appeal basis.",
          "debriefs",
          "Generate a debrief for every participating solver team or mark the team as explicitly excluded."
        )
      );
    }
  });

  if (perDebriefCoverage.length > 1) {
    const counts = perDebriefCoverage.map((entry) => entry.feedbackCount);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    if (max - min > maxCoverageVariance) {
      findings.push(
        finding(
          "UNEVEN_FEEDBACK_COVERAGE",
          "high",
          `Feedback coverage varies from ${min} to ${max} rubric comments across teams.`,
          "Uneven debrief depth can create appearance of favoritism or weaken appeal records.",
          "debriefs",
          "Normalize feedback coverage so every team receives comparable rubric-linked detail."
        )
      );
    }
  }

  const severityCounts = countBySeverity(findings);
  const decision = chooseDecision(severityCounts);

  return {
    packetId: String(packet.packetId ?? "unversioned-debrief-packet"),
    challengeId: String(challenge.id ?? "unknown-challenge"),
    generatedAt: now,
    packetDigest: digest(packet),
    decision,
    releaseAllowed: decision === "release_debrief" || decision === "release_with_monitoring",
    severityCounts,
    findings,
    coverage: {
      rubricCount: rubricItems.length,
      debriefCount: debriefs.length,
      teamCount: teams.length,
      perDebrief: perDebriefCoverage
    }
  };
}

function renderMarkdownReport(result) {
  const lines = [
    `# Debrief Feedback Release Guard: ${result.packetId}`,
    "",
    `- Challenge: ${result.challengeId}`,
    `- Decision: ${result.decision}`,
    `- Release allowed: ${result.releaseAllowed ? "yes" : "no"}`,
    `- Packet digest: \`${result.packetDigest}\``,
    `- Generated: ${result.generatedAt}`,
    "",
    "## Severity Counts",
    "",
    "| Severity | Count |",
    "| --- | ---: |",
    ...SEVERITY_ORDER.map((severity) => `| ${severity} | ${result.severityCounts[severity] ?? 0} |`),
    "",
    "## Coverage",
    "",
    "| Team | Target | Feedback comments | Missing rubric ids |",
    "| --- | --- | ---: | --- |",
    ...result.coverage.perDebrief.map(
      (entry) =>
        `| ${entry.teamId || "(missing)"} | ${entry.releaseTarget} | ${entry.feedbackCount} | ${
          entry.missingRubricIds.length > 0 ? entry.missingRubricIds.join(", ") : "none"
        } |`
    ),
    "",
    "## Findings",
    ""
  ];

  if (result.findings.length === 0) {
    lines.push("No release-blocking findings were detected.");
  } else {
    result.findings.forEach((item, index) => {
      lines.push(
        `### ${index + 1}. ${item.code} (${item.severity})`,
        "",
        item.message,
        "",
        `Path: \`${item.path}\``,
        "",
        `Remediation: ${item.remediation}`,
        ""
      );
    });
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const counts = result.severityCounts;
  const maxCount = Math.max(1, ...SEVERITY_ORDER.map((severity) => counts[severity] ?? 0));
  const bars = SEVERITY_ORDER.map((severity, index) => {
    const count = counts[severity] ?? 0;
    const width = Math.round((count / maxCount) * 360);
    const y = 150 + index * 48;
    return [
      `<text x="48" y="${y + 19}" class="label">${escapeXml(severity)}</text>`,
      `<rect x="140" y="${y}" width="360" height="26" rx="5" class="track"/>`,
      `<rect x="140" y="${y}" width="${width}" height="26" rx="5" class="${escapeXml(severity)}"/>`,
      `<text x="516" y="${y + 19}" class="count">${count}</text>`
    ].join("\n");
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="390" viewBox="0 0 720 390" role="img" aria-labelledby="title desc">
  <title id="title">SCIBASE debrief release guard summary</title>
  <desc id="desc">Decision ${escapeXml(result.decision)} for packet ${escapeXml(result.packetId)}</desc>
  <style>
    .bg { fill: #f7f5ef; }
    .panel { fill: #ffffff; stroke: #202124; stroke-width: 2; }
    .title { font: 700 28px Arial, sans-serif; fill: #202124; }
    .subtitle { font: 400 15px Arial, sans-serif; fill: #4e565f; }
    .decision { font: 700 22px Arial, sans-serif; fill: #202124; }
    .label { font: 700 15px Arial, sans-serif; fill: #202124; text-transform: uppercase; }
    .count { font: 700 16px Arial, sans-serif; fill: #202124; }
    .track { fill: #e9e3d6; }
    .critical { fill: #bd2f2f; }
    .high { fill: #d9822b; }
    .warning { fill: #d7b23f; }
    .info { fill: #4d8f7a; }
    .footer { font: 400 13px Arial, sans-serif; fill: #5f686f; }
  </style>
  <rect width="720" height="390" class="bg"/>
  <rect x="26" y="26" width="668" height="338" rx="8" class="panel"/>
  <text x="48" y="76" class="title">Challenge Debrief Feedback Release Guard</text>
  <text x="48" y="104" class="subtitle">Synthetic packet check for scientific bounty post-evaluation feedback</text>
  <text x="48" y="132" class="decision">Decision: ${escapeXml(result.decision)}</text>
  ${bars}
  <text x="48" y="340" class="footer">Packet ${escapeXml(result.packetId)} | digest ${escapeXml(result.packetDigest.slice(0, 16))}</text>
</svg>
`;
}

function finding(code, severity, message, detail, path, remediation) {
  return { code, severity, message, detail, path, remediation };
}

function chooseDecision(counts) {
  if ((counts.critical ?? 0) > 0) return "hold_debrief_release";
  if ((counts.high ?? 0) > 0) return "revise_before_release";
  if ((counts.warning ?? 0) > 0) return "release_with_monitoring";
  return "release_debrief";
}

function countBySeverity(findings) {
  const counts = Object.fromEntries(SEVERITY_ORDER.map((severity) => [severity, 0]));
  findings.forEach((findingItem) => {
    counts[findingItem.severity] = (counts[findingItem.severity] ?? 0) + 1;
  });
  return counts;
}

function debriefReleaseText(debrief) {
  const parts = [];
  [
    "summary",
    "publicSummary",
    "decisionRationale",
    "appealInstructions",
    "releaseNotes",
    "solverMessage",
    "reviewerNotes"
  ].forEach((key) => {
    if (typeof debrief[key] === "string") parts.push(debrief[key]);
  });

  asArray(debrief.feedback ?? debrief.rubricFeedback).forEach((entry) => {
    ["comment", "recommendation", "evidence", "solverVisibleText"].forEach((key) => {
      if (typeof entry[key] === "string") parts.push(entry[key]);
    });
  });

  return parts.join("\n");
}

function collectPrivateTerms(packet, challenge) {
  return uniqueStrings([
    ...asArray(packet.privateBenchmarkLabels),
    ...asArray(packet.privateBenchmarks),
    ...asArray(packet.confidentialTerms),
    ...asArray(challenge.privateBenchmarkLabels),
    ...asArray(challenge.privateBenchmarks),
    ...asArray(challenge.confidentialTerms)
  ]);
}

function collectReviewerTerms(reviewers) {
  return uniqueStrings(
    asArray(reviewers).flatMap((reviewer) => [
      reviewer.name,
      reviewer.email,
      reviewer.handle,
      ...asArray(reviewer.aliases)
    ])
  );
}

function collectOtherTeamTerms(teams, recipientTeamId) {
  return uniqueStrings(
    teams
      .filter((team) => String(team.id) !== String(recipientTeamId))
      .flatMap((team) => [
        ...asArray(team.protectedTerms),
        ...asArray(team.tradeSecretLabels),
        ...asArray(team.privateArtifactNames)
      ])
  );
}

function matchTerms(text, terms) {
  return terms.filter((term) => containsTerm(text, term));
}

function containsTerm(text, term) {
  if (!term) return false;
  return normalize(text).includes(normalize(term));
}

function countWords(text) {
  const matches = String(text).trim().match(/[A-Za-z0-9][A-Za-z0-9'-]*/g);
  return matches ? matches.length : 0;
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function uniqueStrings(values) {
  const seen = new Set();
  return values
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value) => {
      const normalized = normalize(value);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function normalize(value) {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

module.exports = {
  evaluateDebriefPacket,
  renderMarkdownReport,
  renderSvgSummary,
  digest
};
