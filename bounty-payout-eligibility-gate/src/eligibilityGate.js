const crypto = require("crypto");

const DEFAULT_SUPPORTED_COUNTRIES = new Set([
  "AT",
  "AU",
  "BE",
  "BR",
  "CA",
  "CH",
  "DE",
  "DK",
  "ES",
  "FI",
  "FR",
  "GB",
  "IE",
  "IT",
  "JP",
  "NL",
  "NO",
  "NZ",
  "PT",
  "SE",
  "SG",
  "US"
]);

const BLOCKED_WATCHLIST_STATUSES = new Set(["match", "blocked", "review-required"]);

function normalizeCountry(country) {
  return String(country || "").trim().toUpperCase();
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function auditDigest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function action(code, severity, message, owner, dueInDays) {
  return {
    code,
    severity,
    owner,
    dueInDays,
    message
  };
}

function evaluateContributor(contributor, supportedCountries = DEFAULT_SUPPORTED_COUNTRIES) {
  const country = normalizeCountry(contributor.country);
  const actions = [];

  if (!contributor.identityAttested) {
    actions.push(
      action(
        "identity_attestation_required",
        "blocker",
        "Collect contributor identity attestation before payout review.",
        contributor.id,
        2
      )
    );
  }

  if (!supportedCountries.has(country)) {
    actions.push(
      action(
        "unsupported_payout_country",
        "blocker",
        `Country ${country || "UNKNOWN"} is not currently enabled for direct payout routing.`,
        contributor.id,
        1
      )
    );
  }

  if (!contributor.payoutMethodVerified) {
    actions.push(
      action(
        "payout_method_required",
        "blocker",
        "Verify payout method before settlement can be released.",
        contributor.id,
        3
      )
    );
  }

  if (contributor.taxFormStatus !== "valid") {
    actions.push(
      action(
        "tax_form_required",
        "blocker",
        "Collect a valid tax form or platform-approved tax attestation.",
        contributor.id,
        5
      )
    );
  }

  if (contributor.institutionRouting?.required && !contributor.institutionRouting.approved) {
    actions.push(
      action(
        "institution_routing_approval_required",
        "hold",
        `Confirm payout routing with ${contributor.institutionRouting.institution || "the contributor institution"}.`,
        contributor.id,
        5
      )
    );
  }

  if (BLOCKED_WATCHLIST_STATUSES.has(String(contributor.watchlistStatus || "").toLowerCase())) {
    actions.push(
      action(
        "watchlist_review_required",
        "blocker",
        "Hold settlement until compliance review clears the contributor.",
        contributor.id,
        1
      )
    );
  }

  if (!contributor.ipAssignmentConsent) {
    actions.push(
      action(
        "ip_release_consent_required",
        "hold",
        "Confirm IP handoff consent before releasing sponsor license rights.",
        contributor.id,
        4
      )
    );
  }

  const blockers = actions.filter((item) => item.severity === "blocker");
  const holds = actions.filter((item) => item.severity === "hold");
  const status = blockers.length > 0 ? "blocked" : holds.length > 0 ? "hold" : "ready";

  return {
    contributorId: contributor.id,
    displayName: contributor.displayName,
    country,
    status,
    blockerCount: blockers.length,
    holdCount: holds.length,
    actions
  };
}

function validateAwardSplits(team) {
  const contributorIds = new Set(team.contributors.map((contributor) => contributor.id));
  const splitTotal = team.awardSplits.reduce((sum, split) => sum + Number(split.percent || 0), 0);
  const unknownSplits = team.awardSplits.filter((split) => !contributorIds.has(split.contributorId));
  const missingSplits = team.contributors.filter(
    (contributor) => !team.awardSplits.some((split) => split.contributorId === contributor.id)
  );
  const actions = [];

  if (Math.round(splitTotal * 100) / 100 !== 100) {
    actions.push(
      action(
        "award_split_total_invalid",
        "blocker",
        `Award splits must total 100 percent; current total is ${splitTotal}.`,
        team.id,
        1
      )
    );
  }

  for (const split of unknownSplits) {
    actions.push(
      action(
        "award_split_unknown_contributor",
        "blocker",
        `Award split references unknown contributor ${split.contributorId}.`,
        team.id,
        1
      )
    );
  }

  for (const contributor of missingSplits) {
    actions.push(
      action(
        "award_split_missing_contributor",
        "hold",
        `Contributor ${contributor.id} has no payout split.`,
        team.id,
        2
      )
    );
  }

  return {
    splitTotal,
    actions
  };
}

function buildPayoutReadinessPacket(input, options = {}) {
  const supportedCountries = options.supportedCountries
    ? new Set([...options.supportedCountries].map(normalizeCountry))
    : DEFAULT_SUPPORTED_COUNTRIES;
  const challenge = input.challenge;
  const team = input.team;
  const contributorResults = team.contributors.map((contributor) =>
    evaluateContributor(contributor, supportedCountries)
  );
  const splitCheck = validateAwardSplits(team);
  const contributorActions = contributorResults.flatMap((result) => result.actions);
  const allActions = [...splitCheck.actions, ...contributorActions];
  const blockerCount = allActions.filter((item) => item.severity === "blocker").length;
  const holdCount = allActions.filter((item) => item.severity === "hold").length;
  const challengeActions = [];

  if (!challenge.settlementFunded) {
    challengeActions.push(
      action(
        "settlement_not_funded",
        "blocker",
        "Sponsor funds must be confirmed before payout release.",
        challenge.id,
        1
      )
    );
  }

  const finalActions = [...challengeActions, ...allActions];
  const finalBlockers = finalActions.filter((item) => item.severity === "blocker").length;
  const finalHolds = finalActions.filter((item) => item.severity === "hold").length;
  const status = finalBlockers > 0 ? "blocked" : finalHolds > 0 ? "hold" : "ready";
  const ipRelease = status === "ready" && challenge.settlementFunded ? "release-after-payout" : "blocked-until-ready";
  const payoutPlan = team.awardSplits.map((split) => {
    const contributor = team.contributors.find((item) => item.id === split.contributorId);
    return {
      contributorId: split.contributorId,
      displayName: contributor?.displayName || split.contributorId,
      percent: split.percent,
      amountUsd: Math.round(challenge.bountyAmountUsd * (Number(split.percent) / 100) * 100) / 100,
      routingStatus:
        contributorResults.find((result) => result.contributorId === split.contributorId)?.status || "unknown"
    };
  });
  const unsignedPacket = {
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    sponsor: challenge.sponsor,
    teamId: team.id,
    teamName: team.name,
    bountyAmountUsd: challenge.bountyAmountUsd,
    settlementFunded: challenge.settlementFunded,
    status,
    blockerCount: finalBlockers,
    holdCount: finalHolds,
    ipRelease,
    contributorResults,
    payoutPlan,
    remediationActions: finalActions.sort((left, right) => {
      const severityRank = { blocker: 0, hold: 1, info: 2 };
      return severityRank[left.severity] - severityRank[right.severity] || left.dueInDays - right.dueInDays;
    })
  };

  return {
    ...unsignedPacket,
    auditDigest: auditDigest(unsignedPacket)
  };
}

function summarizeForSponsor(packet) {
  return {
    status: packet.status,
    settlementRecommendation:
      packet.status === "ready"
        ? "release_payout"
        : packet.status === "hold"
          ? "hold_for_routing_confirmation"
          : "block_until_remediated",
    nextActions: packet.remediationActions.map((item) => ({
      code: item.code,
      owner: item.owner,
      dueInDays: item.dueInDays,
      message: item.message
    })),
    auditDigest: packet.auditDigest
  };
}

module.exports = {
  DEFAULT_SUPPORTED_COUNTRIES,
  auditDigest,
  buildPayoutReadinessPacket,
  evaluateContributor,
  normalizeCountry,
  stableJson,
  summarizeForSponsor,
  validateAwardSplits
};
