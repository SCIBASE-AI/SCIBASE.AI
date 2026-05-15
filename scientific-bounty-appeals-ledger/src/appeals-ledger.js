const crypto = require("node:crypto");

function buildAppealsLedger(challenge) {
  const validation = validateChallenge(challenge);
  const submissions = indexById(challenge.submissions || []);
  const reviewers = indexById(challenge.reviewers || []);
  const snapshots = indexBySubmission(challenge.evidenceSnapshots || []);
  const appeals = (challenge.appeals || []).map((appeal) =>
    evaluateAppeal(appeal, challenge, submissions, reviewers, snapshots)
  );
  const payout = summarizePayouts(challenge, appeals);
  const auditTrail = buildAuditTrail(challenge, appeals, payout);
  const dashboard = buildArbitrationDashboard(challenge, appeals, payout);

  const ledger = {
    challengeId: challenge.challengeId,
    title: challenge.title,
    asOf: challenge.asOf,
    validation,
    appeals,
    payout,
    ipTransferGuards: buildIpTransferGuards(challenge, appeals),
    sponsorFeedbackPacket: buildSponsorFeedbackPacket(challenge, appeals),
    dashboard,
    auditTrail
  };

  ledger.digest = stableDigest(ledger);
  return ledger;
}

function validateChallenge(challenge) {
  const required = [
    ["challengeId", challenge.challengeId],
    ["title", challenge.title],
    ["asOf", challenge.asOf],
    ["appealPolicy.appealWindowHours", challenge.appealPolicy && challenge.appealPolicy.appealWindowHours],
    ["submissions", (challenge.submissions || []).length],
    ["reviewers", (challenge.reviewers || []).length],
    ["evidenceSnapshots", (challenge.evidenceSnapshots || []).length],
    ["appeals", (challenge.appeals || []).length]
  ];
  const missing = required.filter(([, value]) => !value).map(([field]) => field);
  return {
    status: missing.length === 0 ? "passed" : "incomplete",
    score: Math.max(0, 100 - missing.length * 12),
    missing
  };
}

function evaluateAppeal(appeal, challenge, submissions, reviewers, snapshots) {
  const submission = submissions.get(appeal.submissionId);
  const policy = challenge.appealPolicy || {};
  const asOf = new Date(challenge.asOf);
  const filedAt = new Date(appeal.filedAt);
  const decisionAt = submission ? new Date(submission.decisionAt) : null;
  const appealWindowEndsAt = decisionAt ? addHours(decisionAt, policy.appealWindowHours || 0) : null;
  const responseDueAt = addHours(filedAt, policy.reviewerResponseHours || 0);
  const eligibility = evaluateEligibility(appeal, submission, policy, filedAt, appealWindowEndsAt);
  const evidenceLock = evaluateEvidenceLock(submission, snapshots.get(appeal.submissionId));
  const reviewerConflicts = evaluateReviewerConflicts(appeal, challenge, submission, reviewers);
  const sla = evaluateSla(appeal, asOf, responseDueAt);
  const payoutHold = evaluatePayoutHold(appeal, submission, eligibility);
  const ipGuard = evaluateIpGuard(challenge, appeal, payoutHold);

  return {
    id: appeal.id,
    submissionId: appeal.submissionId,
    status: appeal.status,
    reason: appeal.reason,
    summary: appeal.summary,
    eligibility,
    evidenceLock,
    reviewerConflicts,
    sla,
    payoutHold,
    ipGuard,
    nextAction: chooseNextAction(appeal, eligibility, evidenceLock, reviewerConflicts, sla, payoutHold)
  };
}

function evaluateEligibility(appeal, submission, policy, filedAt, appealWindowEndsAt) {
  const acceptedReason = (policy.acceptedReasons || []).includes(appeal.reason);
  const withinWindow = Boolean(appealWindowEndsAt && filedAt <= appealWindowEndsAt);
  const knownSubmission = Boolean(submission);
  const allowedRole = ["solver", "competing-solver", "sponsor", "reviewer"].includes(appeal.filedBy && appeal.filedBy.role);
  const failures = [];

  if (!knownSubmission) failures.push("unknown-submission");
  if (!acceptedReason) failures.push("unsupported-reason");
  if (!withinWindow) failures.push("outside-appeal-window");
  if (!allowedRole) failures.push("unsupported-appellant-role");

  return {
    status: failures.length === 0 ? "eligible" : "ineligible",
    acceptedReason,
    withinWindow,
    appealWindowEndsAt: appealWindowEndsAt ? appealWindowEndsAt.toISOString() : null,
    failures
  };
}

function evaluateEvidenceLock(submission, snapshot) {
  if (!submission || !snapshot) {
    return {
      status: "missing-lock",
      coverage: 0,
      missingArtifactIds: submission ? submission.artifactIds.slice() : []
    };
  }

  const hashes = snapshot.artifactHashes || {};
  const missingArtifactIds = (submission.artifactIds || []).filter((artifactId) => !hashes[artifactId]);
  const coverage = submission.artifactIds.length === 0
    ? 100
    : Math.round(((submission.artifactIds.length - missingArtifactIds.length) / submission.artifactIds.length) * 100);

  return {
    status: missingArtifactIds.length === 0 ? "locked" : "partial-lock",
    snapshotId: snapshot.id,
    lockedAt: snapshot.lockedAt,
    coverage,
    missingArtifactIds
  };
}

function evaluateReviewerConflicts(appeal, challenge, submission, reviewers) {
  const sponsorName = challenge.sponsor && challenge.sponsor.name;
  const conflicts = (appeal.reviewerIds || []).flatMap((reviewerId) => {
    const reviewer = reviewers.get(reviewerId);
    if (!reviewer) {
      return [{
        reviewerId,
        type: "unknown-reviewer",
        message: "Reviewer id is not registered in the challenge reviewer roster."
      }];
    }

    const items = [];
    if (sponsorName && (reviewer.affiliations || []).includes(sponsorName)) {
      items.push({
        reviewerId,
        type: "sponsor-affiliation",
        message: `${reviewer.name} is affiliated with the sponsor.`
      });
    }
    if (submission && (reviewer.reviewedSubmissionIds || []).includes(submission.id) && appeal.reason === "conflict-of-interest") {
      items.push({
        reviewerId,
        type: "reviewed-contested-submission",
        message: `${reviewer.name} reviewed the contested submission.`
      });
    }
    return items;
  });

  return {
    status: conflicts.length === 0 ? "clear" : "conflict-review-needed",
    conflicts
  };
}

function evaluateSla(appeal, asOf, responseDueAt) {
  if (appeal.status === "resolved") {
    return {
      status: "resolved",
      responseDueAt: responseDueAt.toISOString(),
      hoursOverdue: 0
    };
  }

  const hoursOverdue = Math.max(0, Math.ceil((asOf - responseDueAt) / 36e5));
  return {
    status: hoursOverdue > 0 ? "overdue" : "within-sla",
    responseDueAt: responseDueAt.toISOString(),
    hoursOverdue
  };
}

function evaluatePayoutHold(appeal, submission, eligibility) {
  if (!submission || eligibility.status !== "eligible") {
    return {
      status: "no-hold",
      holdAmount: 0,
      reason: "Appeal is not eligible for a payout hold."
    };
  }
  if (appeal.status === "resolved") {
    return {
      status: "released",
      holdAmount: 0,
      releaseAmount: submission.awardAmount,
      reason: "Appeal is resolved; payout may follow the recorded route."
    };
  }
  return {
    status: "hold",
    holdAmount: submission.awardAmount,
    releaseAmount: 0,
    reason: "Eligible open appeal keeps the award in hold until arbitration closes."
  };
}

function evaluateIpGuard(challenge, appeal, payoutHold) {
  const holdDuringAppeal = Boolean(challenge.ipPolicy && challenge.ipPolicy.holdDuringAppeal);
  if (holdDuringAppeal && payoutHold.status === "hold") {
    return {
      status: "blocked",
      message: "IP transfer is blocked while an eligible appeal holds payout."
    };
  }
  if (appeal.status === "resolved") {
    return {
      status: "ready-after-payout",
      message: "IP transfer can follow the payout outcome."
    };
  }
  return {
    status: "not-required",
    message: "No IP transfer guard is required for this appeal state."
  };
}

function summarizePayouts(challenge, appeals) {
  const heldBySubmission = new Map();
  appeals.forEach((appeal) => {
    if (appeal.payoutHold.status === "hold") {
      heldBySubmission.set(appeal.submissionId, appeal.payoutHold.holdAmount);
    }
  });

  const submissions = challenge.submissions || [];
  const totalAwarded = submissions.reduce((sum, submission) => sum + (submission.awardAmount || 0), 0);
  const heldAmount = [...heldBySubmission.values()].reduce((sum, amount) => sum + amount, 0);

  return {
    totalAwarded,
    heldAmount,
    releasableAmount: totalAwarded - heldAmount,
    heldSubmissions: [...heldBySubmission.keys()].sort(),
    status: heldAmount > 0 ? "partial-hold" : "all-releasable"
  };
}

function buildIpTransferGuards(challenge, appeals) {
  return appeals
    .filter((appeal) => appeal.ipGuard.status !== "not-required")
    .map((appeal) => ({
      appealId: appeal.id,
      submissionId: appeal.submissionId,
      status: appeal.ipGuard.status,
      message: appeal.ipGuard.message
    }));
}

function buildSponsorFeedbackPacket(challenge, appeals) {
  return {
    sponsorId: challenge.sponsor && challenge.sponsor.id,
    openAppeals: appeals.filter((appeal) => appeal.status !== "resolved").length,
    overdueResponses: appeals.filter((appeal) => appeal.sla.status === "overdue").length,
    conflictReviews: appeals.filter((appeal) => appeal.reviewerConflicts.status !== "clear").length,
    requestedSponsorActions: appeals
      .filter((appeal) => appeal.nextAction.owner === "sponsor")
      .map((appeal) => appeal.nextAction.message)
  };
}

function buildArbitrationDashboard(challenge, appeals, payout) {
  return {
    challengeId: challenge.challengeId,
    appealCount: appeals.length,
    openAppealCount: appeals.filter((appeal) => appeal.status !== "resolved").length,
    payoutStatus: payout.status,
    highPriorityItems: appeals
      .filter((appeal) => appeal.sla.status === "overdue" || appeal.reviewerConflicts.status !== "clear")
      .map((appeal) => ({
        appealId: appeal.id,
        reason: appeal.reason,
        nextAction: appeal.nextAction.message
      }))
  };
}

function buildAuditTrail(challenge, appeals, payout) {
  const events = [];
  (challenge.submissions || []).forEach((submission) => {
    events.push({
      at: submission.decisionAt,
      type: "decision-recorded",
      submissionId: submission.id,
      amount: submission.awardAmount
    });
  });
  appeals.forEach((appeal) => {
    events.push({
      at: appeal.eligibility.appealWindowEndsAt,
      type: "appeal-window-ends",
      appealId: appeal.id
    });
    events.push({
      at: appeal.sla.responseDueAt,
      type: "reviewer-response-due",
      appealId: appeal.id,
      status: appeal.sla.status
    });
    if (appeal.payoutHold.status === "hold") {
      events.push({
        at: challenge.asOf,
        type: "payout-held",
        appealId: appeal.id,
        submissionId: appeal.submissionId,
        amount: appeal.payoutHold.holdAmount
      });
    }
  });
  events.push({
    at: challenge.asOf,
    type: "payout-summary",
    heldAmount: payout.heldAmount,
    releasableAmount: payout.releasableAmount
  });

  return events.sort((a, b) => `${a.at}:${a.type}`.localeCompare(`${b.at}:${b.type}`));
}

function chooseNextAction(appeal, eligibility, evidenceLock, reviewerConflicts, sla, payoutHold) {
  if (eligibility.status !== "eligible") {
    return {
      owner: "arbitrator",
      message: `Reject or request correction: ${eligibility.failures.join(", ")}.`
    };
  }
  if (evidenceLock.status !== "locked") {
    return {
      owner: "arbitrator",
      message: "Lock missing evidence artifacts before continuing arbitration."
    };
  }
  if (reviewerConflicts.status !== "clear") {
    return {
      owner: "sponsor",
      message: "Assign an independent reviewer to resolve conflict-of-interest concerns."
    };
  }
  if (sla.status === "overdue") {
    return {
      owner: "arbitrator",
      message: "Escalate overdue reviewer response."
    };
  }
  if (payoutHold.status === "hold") {
    return {
      owner: "arbitrator",
      message: "Keep payout and IP transfer on hold until appeal resolution."
    };
  }
  return {
    owner: "platform",
    message: "Release payout according to the recorded route."
  };
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 36e5);
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function indexBySubmission(items) {
  return new Map(items.map((item) => [item.submissionId, item]));
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  buildAppealsLedger,
  validateChallenge,
  stableDigest
};
