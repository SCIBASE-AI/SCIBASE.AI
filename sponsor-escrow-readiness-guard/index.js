const DAY_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP"]);

function parseDate(value, field) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${field}: ${value}`);
  }
  return date;
}

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

function moneyAmount(value, field) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }
  return Math.round(amount * 100) / 100;
}

function buildFinding(code, severity, message, remediation) {
  return { code, severity, message, remediation };
}

function payoutScheduleTotal(schedule) {
  return (schedule || []).reduce((sum, item) => sum + moneyAmount(item.amount, "payout.amount"), 0);
}

function validatePayoutSchedule(challenge) {
  const findings = [];
  const schedule = challenge.payoutSchedule || [];
  const prizeAmount = moneyAmount(challenge.prizeAmount, "challenge.prizeAmount");

  if (schedule.length === 0) {
    findings.push(buildFinding(
      "PAYOUT_SCHEDULE_MISSING",
      "block",
      `${challenge.id} does not define milestone or final payout routing.`,
      "Attach a payout schedule before solver submissions open."
    ));
    return findings;
  }

  const total = payoutScheduleTotal(schedule);
  if (total !== prizeAmount) {
    findings.push(buildFinding(
      "PAYOUT_TOTAL_MISMATCH",
      "block",
      `${challenge.id} payout schedule totals ${total}, but advertised prize is ${prizeAmount}.`,
      "Reconcile milestone and final payout rows to the exact advertised prize."
    ));
  }

  for (const row of schedule) {
    if (!row.releaseTrigger || !row.destinationClass) {
      findings.push(buildFinding(
        "PAYOUT_ROUTE_INCOMPLETE",
        "revise",
        `${challenge.id} has a payout row without release trigger or destination class.`,
        "Add release trigger and solver/team/institution destination class to each payout row."
      ));
    }
  }

  return findings;
}

function validateEscrowEvidence(challenge, now) {
  const findings = [];
  const escrow = challenge.escrow || {};
  const prizeAmount = moneyAmount(challenge.prizeAmount, "challenge.prizeAmount");
  const awardDate = parseDate(challenge.awardDecisionDate, "challenge.awardDecisionDate");

  if (!SUPPORTED_CURRENCIES.has(challenge.currency)) {
    findings.push(buildFinding(
      "UNSUPPORTED_CURRENCY",
      "block",
      `${challenge.id} uses unsupported prize currency ${challenge.currency}.`,
      "Convert the challenge prize to a supported payout currency before launch."
    ));
  }

  if (!escrow.provider || !escrow.evidenceId) {
    findings.push(buildFinding(
      "ESCROW_EVIDENCE_MISSING",
      "block",
      `${challenge.id} lacks sponsor escrow evidence.`,
      "Attach escrow provider and evidence ID before accepting submissions."
    ));
  }

  const fundedAmount = moneyAmount(escrow.fundedAmount || 0, "escrow.fundedAmount");
  if (fundedAmount < prizeAmount) {
    findings.push(buildFinding(
      "ESCROW_UNDERFUNDED",
      "block",
      `${challenge.id} escrow holds ${fundedAmount}, below advertised prize ${prizeAmount}.`,
      "Fund the escrow to at least the advertised prize before challenge launch."
    ));
  }

  if (!escrow.authorizedBy || !escrow.releaseApprovalId) {
    findings.push(buildFinding(
      "SPONSOR_RELEASE_AUTH_MISSING",
      "block",
      `${challenge.id} has no sponsor release authorization on file.`,
      "Record sponsor release approval before the prize is advertised as payable."
    ));
  }

  if (escrow.expiresAt) {
    const expiresAt = parseDate(escrow.expiresAt, "escrow.expiresAt");
    if (expiresAt < awardDate) {
      findings.push(buildFinding(
        "ESCROW_EXPIRES_BEFORE_AWARD",
        "block",
        `${challenge.id} escrow expires before the award decision date.`,
        "Extend escrow validity beyond the award decision and dispute window."
      ));
    }
  }

  if (escrow.verifiedAt) {
    const verifiedAt = parseDate(escrow.verifiedAt, "escrow.verifiedAt");
    if (daysBetween(verifiedAt, now) > 30) {
      findings.push(buildFinding(
        "ESCROW_EVIDENCE_STALE",
        "revise",
        `${challenge.id} escrow verification is older than 30 days.`,
        "Refresh escrow evidence before opening or continuing submissions."
      ));
    }
  }

  return findings;
}

function summarizeDecision(findings) {
  if (findings.some((item) => item.severity === "block")) {
    return "hold";
  }
  if (findings.some((item) => item.severity === "revise")) {
    return "revise";
  }
  return "release";
}

function evaluateSponsorEscrowPacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new Error("Packet must be an object.");
  }
  if (!Array.isArray(packet.challenges)) {
    throw new Error("Packet requires challenges.");
  }

  const now = new Date(packet.generatedAt || Date.now());
  if (Number.isNaN(now.getTime())) {
    throw new Error("generatedAt must be a valid timestamp.");
  }

  const challengeResults = packet.challenges.map((challenge) => {
    const findings = [
      ...validateEscrowEvidence(challenge, now),
      ...validatePayoutSchedule(challenge)
    ];

    return {
      challengeId: challenge.id,
      sponsorId: challenge.sponsorId,
      prizeAmount: moneyAmount(challenge.prizeAmount, "challenge.prizeAmount"),
      currency: challenge.currency,
      decision: summarizeDecision(findings),
      blockerCount: findings.filter((item) => item.severity === "block").length,
      revisionCount: findings.filter((item) => item.severity === "revise").length,
      findings
    };
  });

  const allFindings = challengeResults.flatMap((item) => item.findings);
  const decision = summarizeDecision(allFindings);

  return {
    batchId: packet.batchId,
    generatedAt: now.toISOString(),
    decision,
    checkedChallenges: challengeResults.length,
    releaseCount: challengeResults.filter((item) => item.decision === "release").length,
    reviseCount: challengeResults.filter((item) => item.decision === "revise").length,
    holdCount: challengeResults.filter((item) => item.decision === "hold").length,
    blockerCount: allFindings.filter((item) => item.severity === "block").length,
    revisionCount: allFindings.filter((item) => item.severity === "revise").length,
    challengeResults,
    reviewerSummary: decision === "release"
      ? "All sponsor escrow and payout readiness checks are satisfied."
      : "Hold or revise challenge launch until prize funding evidence is complete."
  };
}

module.exports = {
  SUPPORTED_CURRENCIES,
  evaluateSponsorEscrowPacket,
  payoutScheduleTotal,
  summarizeDecision
};
