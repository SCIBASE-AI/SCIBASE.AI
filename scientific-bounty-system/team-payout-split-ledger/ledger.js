"use strict";

const BASIS_POINTS = 10000;

function buildPayoutLedgers(challenges) {
  return challenges.map(buildPayoutLedger);
}

function buildPayoutLedger(challenge) {
  validateChallengeShape(challenge);

  const acceptedMilestones = challenge.milestones.filter((milestone) => milestone.status === "accepted");
  const lockedMilestones = challenge.milestones.filter((milestone) => milestone.status !== "accepted");
  const unlockedAmountCents = acceptedMilestones.reduce(
    (total, milestone) => total + milestone.amountCents,
    0,
  );

  const routeFindings = reviewRoutes(challenge);
  const splitFindings = reviewSplits(challenge);
  const overheadFindings = reviewInstitutionOverhead(challenge);
  const solverShareFindings = reviewMinimumSolverShare(challenge);
  const milestoneFindings = lockedMilestones.map((milestone) =>
    finding(
      "milestone_locked",
      "hold",
      milestone.id,
      `${milestone.id} is ${milestone.status}; funds stay locked until sponsor acceptance.`,
      "Wait for sponsor acceptance or revise the deliverable packet.",
    ),
  );

  const allocations = allocateContributors(challenge, unlockedAmountCents);
  const findings = [
    ...milestoneFindings,
    ...routeFindings,
    ...splitFindings,
    ...overheadFindings,
    ...solverShareFindings,
  ];
  const payable = findings.every((item) => item.severity !== "block") && allocations.length > 0;

  return {
    challengeId: challenge.challengeId,
    title: challenge.title,
    currency: challenge.currency,
    totalPrizeCents: challenge.totalPrizeCents,
    unlockedAmountCents,
    lockedAmountCents: challenge.totalPrizeCents - unlockedAmountCents,
    payable,
    allocations,
    findings,
    receipt: buildReceipt(challenge, allocations, findings, acceptedMilestones, lockedMilestones),
  };
}

function validateChallengeShape(challenge) {
  if (!challenge.challengeId || !challenge.title) {
    throw new Error("Challenge must include challengeId and title.");
  }
  if (!Number.isInteger(challenge.totalPrizeCents) || challenge.totalPrizeCents <= 0) {
    throw new Error(`${challenge.challengeId} must include a positive totalPrizeCents.`);
  }
  if (!Array.isArray(challenge.milestones) || challenge.milestones.length === 0) {
    throw new Error(`${challenge.challengeId} must include milestones.`);
  }
  if (!Array.isArray(challenge.contributors) || challenge.contributors.length === 0) {
    throw new Error(`${challenge.challengeId} must include contributors.`);
  }
}

function reviewRoutes(challenge) {
  return challenge.contributors
    .filter((contributor) => contributor.payoutRouteStatus !== "verified")
    .map((contributor) =>
      finding(
        "payout_route_unverified",
        "block",
        contributor.id,
        `${contributor.id} has payout route status ${contributor.payoutRouteStatus}.`,
        "Hold release for this contributor until payout route verification is complete.",
      ),
    );
}

function reviewSplits(challenge) {
  const splitTotal = challenge.contributors.reduce(
    (total, contributor) => total + contributor.splitBasisPoints,
    0,
  );
  if (splitTotal === BASIS_POINTS) {
    return [];
  }

  return [
    finding(
      "split_total_mismatch",
      "block",
      challenge.challengeId,
      `Contributor splits total ${splitTotal} basis points instead of ${BASIS_POINTS}.`,
      "Rebalance contributor splits before payout approval.",
    ),
  ];
}

function reviewInstitutionOverhead(challenge) {
  return challenge.contributors.flatMap((contributor) => {
    const overheadBasisPoints = contributor.institutionOverheadBasisPoints ?? 0;
    if (overheadBasisPoints <= challenge.policy.maxInstitutionOverheadBasisPoints) {
      return [];
    }

    return [
      finding(
        "institution_overhead_exceeds_cap",
        "block",
        contributor.id,
        `${contributor.id} routes ${overheadBasisPoints} basis points to an institution, above the ${challenge.policy.maxInstitutionOverheadBasisPoints} cap.`,
        "Lower institution overhead or attach sponsor-approved exception evidence.",
      ),
    ];
  });
}

function reviewMinimumSolverShare(challenge) {
  return challenge.contributors.flatMap((contributor) => {
    const overheadBasisPoints = contributor.institutionOverheadBasisPoints ?? 0;
    const solverShareBasisPoints = contributor.splitBasisPoints - overheadBasisPoints;
    if (solverShareBasisPoints >= challenge.policy.minSolverShareBasisPoints) {
      return [];
    }

    return [
      finding(
        "solver_share_below_minimum",
        "hold",
        contributor.id,
        `${contributor.id} keeps ${solverShareBasisPoints} basis points after overhead, below the ${challenge.policy.minSolverShareBasisPoints} minimum.`,
        "Increase direct solver share or move institution recovery outside the bounty payout.",
      ),
    ];
  });
}

function allocateContributors(challenge, unlockedAmountCents) {
  if (unlockedAmountCents === 0) {
    return [];
  }

  return challenge.contributors.map((contributor) => {
    const grossCents = Math.round((unlockedAmountCents * contributor.splitBasisPoints) / BASIS_POINTS);
    const institutionOverheadBasisPoints = contributor.institutionOverheadBasisPoints ?? 0;
    const institutionCents = Math.round((unlockedAmountCents * institutionOverheadBasisPoints) / BASIS_POINTS);
    const solverCents = grossCents - institutionCents;

    return {
      contributorId: contributor.id,
      role: contributor.role,
      payoutRouteStatus: contributor.payoutRouteStatus,
      grossCents,
      institutionCents,
      solverCents,
    };
  });
}

function buildReceipt(challenge, allocations, findings, acceptedMilestones, lockedMilestones) {
  return {
    awardBasis: `${acceptedMilestones.length} accepted milestone(s), ${lockedMilestones.length} locked milestone(s)`,
    releaseStatus: findings.some((item) => item.severity === "block") ? "blocked" : "ready_for_sponsor_review",
    acceptedMilestones: acceptedMilestones.map((milestone) => milestone.id),
    lockedMilestones: lockedMilestones.map((milestone) => milestone.id),
    totalAllocatedCents: allocations.reduce((total, allocation) => total + allocation.grossCents, 0),
    nextActions: Array.from(new Set(findings.map((item) => item.action))),
  };
}

function finding(code, severity, target, message, action) {
  return { code, severity, target, message, action };
}

function summarizeLedgers(ledgers) {
  return ledgers.reduce(
    (summary, ledger) => {
      summary.total += 1;
      summary.payable += ledger.payable ? 1 : 0;
      summary.blocked += ledger.findings.some((item) => item.severity === "block") ? 1 : 0;
      summary.held += ledger.findings.some((item) => item.severity === "hold") ? 1 : 0;
      summary.unlockedCents += ledger.unlockedAmountCents;
      summary.lockedCents += ledger.lockedAmountCents;
      return summary;
    },
    { total: 0, payable: 0, blocked: 0, held: 0, unlockedCents: 0, lockedCents: 0 },
  );
}

module.exports = {
  BASIS_POINTS,
  buildPayoutLedger,
  buildPayoutLedgers,
  summarizeLedgers,
};
