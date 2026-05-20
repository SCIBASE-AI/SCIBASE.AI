const crypto = require("crypto");

const FLAG_WEIGHTS = {
  MISSING_MILESTONE_EVIDENCE: 3,
  SPONSOR_FEEDBACK_OVERDUE: 3,
  SOLVER_IDLE_RISK: 2,
  RESUBMISSION_WINDOW_EXPIRED: 3,
  REVIEW_PACKET_INCOMPLETE: 2,
};

function auditChallengeMilestones({ challenge, submissions, generatedAt = new Date().toISOString() }) {
  if (!challenge || !Array.isArray(challenge.milestones)) {
    throw new Error("challenge.milestones is required");
  }
  if (!Array.isArray(submissions)) {
    throw new Error("submissions must be an array");
  }

  const milestoneById = new Map(challenge.milestones.map((milestone) => [milestone.id, milestone]));
  const packets = submissions.map((submission) => {
    const milestone = milestoneById.get(submission.currentMilestoneId);
    if (!milestone) {
      throw new Error(`Unknown milestone '${submission.currentMilestoneId}' for ${submission.teamId}`);
    }
    return buildPacket(challenge, milestone, submission, generatedAt);
  });

  const audit = {
    generatedAt,
    challengeId: challenge.challengeId,
    title: challenge.title,
    packets,
  };
  audit.summary = buildProgressSummary(audit);
  return audit;
}

function buildPacket(challenge, milestone, submission, generatedAt) {
  const evidenceTypes = new Set((submission.evidence || []).map((item) => item.type));
  const reviewerItems = new Set(((submission.reviewerPacket || {}).items || []));
  const flags = [];

  const missingEvidence = (milestone.requiredEvidence || []).filter((type) => !evidenceTypes.has(type));
  if (missingEvidence.length > 0) {
    flags.push("MISSING_MILESTONE_EVIDENCE");
  }

  const overdueFeedbackRequests = getOverdueFeedbackRequests(
    submission.sponsorFeedback || [],
    submission.currentMilestoneId,
    challenge.feedbackSlaHours || 48,
    generatedAt
  );
  if (overdueFeedbackRequests.length > 0) {
    flags.push("SPONSOR_FEEDBACK_OVERDUE");
  }

  const idleHours = hoursBetween(submission.lastSolverActivityAt, generatedAt);
  if (Number.isFinite(idleHours) && idleHours > (challenge.idleRiskHours || 96)) {
    flags.push("SOLVER_IDLE_RISK");
  }

  const expiredResubmissionWindows = getExpiredResubmissionWindows(
    submission.resubmissions || [],
    submission.currentMilestoneId,
    milestone.resubmissionHours || 72,
    generatedAt
  );
  if (expiredResubmissionWindows.length > 0) {
    flags.push("RESUBMISSION_WINDOW_EXPIRED");
  }

  const missingReviewerPacketItems = (milestone.reviewerPacketRequirements || []).filter(
    (item) => !reviewerItems.has(item)
  );
  if (missingReviewerPacketItems.length > 0) {
    flags.push("REVIEW_PACKET_INCOMPLETE");
  }

  const decision = decide(flags);
  const packet = {
    teamId: submission.teamId,
    teamName: submission.teamName,
    milestoneId: milestone.id,
    milestoneLabel: milestone.label,
    generatedAt,
    decision,
    flags,
    riskScore: flags.reduce((total, flag) => total + FLAG_WEIGHTS[flag], 0),
    deadlineState: {
      milestoneDueAt: milestone.dueAt,
      feedbackSlaHours: challenge.feedbackSlaHours || 48,
      idleHours: Number.isFinite(idleHours) ? roundHours(idleHours) : null,
      resubmissionHours: milestone.resubmissionHours || 72,
    },
    missingEvidence,
    overdueFeedbackRequests,
    expiredResubmissionWindows,
    missingReviewerPacketItems,
    solverActions: buildSolverActions(missingEvidence, flags),
    sponsorActions: buildSponsorActions(overdueFeedbackRequests, expiredResubmissionWindows, milestone),
    reviewerTasks: buildReviewerTasks(missingReviewerPacketItems, decision),
  };

  packet.auditDigest = createAuditDigest(packet);
  return packet;
}

function getOverdueFeedbackRequests(feedbackRequests, milestoneId, slaHours, generatedAt) {
  return feedbackRequests
    .filter((request) => request.milestoneId === milestoneId && !request.respondedAt)
    .map((request) => ({
      milestoneId: request.milestoneId,
      requestedAt: request.requestedAt,
      hoursOpen: roundHours(hoursBetween(request.requestedAt, generatedAt)),
      slaHours,
    }))
    .filter((request) => request.hoursOpen > slaHours);
}

function getExpiredResubmissionWindows(resubmissions, milestoneId, resubmissionHours, generatedAt) {
  return resubmissions
    .filter((window) => window.milestoneId === milestoneId && !window.submittedAt)
    .map((window) => ({
      milestoneId: window.milestoneId,
      openedAt: window.openedAt,
      hoursOpen: roundHours(hoursBetween(window.openedAt, generatedAt)),
      resubmissionHours,
    }))
    .filter((window) => window.hoursOpen > resubmissionHours);
}

function decide(flags) {
  if (
    flags.includes("SPONSOR_FEEDBACK_OVERDUE") ||
    flags.includes("RESUBMISSION_WINDOW_EXPIRED")
  ) {
    return "hold_for_escalation";
  }
  if (
    flags.includes("MISSING_MILESTONE_EVIDENCE") ||
    flags.includes("SOLVER_IDLE_RISK") ||
    flags.includes("REVIEW_PACKET_INCOMPLETE")
  ) {
    return "needs_solver_action";
  }
  return "ready_for_review";
}

function buildSolverActions(missingEvidence, flags) {
  const actions = [];
  if (missingEvidence.length > 0) {
    actions.push(`Submit ${missingEvidence.join(", ")} evidence before milestone review`);
  }
  if (flags.includes("SOLVER_IDLE_RISK")) {
    actions.push("Post a solver progress update or request a scoped extension");
  }
  return actions;
}

function buildSponsorActions(overdueFeedbackRequests, expiredResubmissionWindows, milestone) {
  const actions = [];
  if (overdueFeedbackRequests.length > 0) {
    actions.push(
      `Resolve overdue sponsor feedback for ${milestone.label} before arbitration`
    );
  }
  if (expiredResubmissionWindows.length > 0) {
    actions.push(`Decide whether to close or extend ${milestone.label} resubmission window`);
  }
  return actions;
}

function buildReviewerTasks(missingReviewerPacketItems, decision) {
  if (decision === "ready_for_review") {
    return ["Route complete milestone packet to reviewers"];
  }
  if (missingReviewerPacketItems.length === 0) {
    return ["Keep reviewer packet locked until sponsor or solver actions clear"];
  }
  return [
    `Add ${missingReviewerPacketItems.join(", ")} to reviewer packet before review routing`,
  ];
}

function buildProgressSummary(audit) {
  const counts = {
    totalTeams: audit.packets.length,
    readyForReview: audit.packets.filter((packet) => packet.decision === "ready_for_review").length,
    needsSolverAction: audit.packets.filter((packet) => packet.decision === "needs_solver_action").length,
    escalations: audit.packets.filter((packet) => packet.decision === "hold_for_escalation").length,
    highRisk: audit.packets.filter((packet) => packet.riskScore >= 10).length,
  };

  const nextActions = [];
  if (counts.escalations > 0) {
    nextActions.push(`Resolve ${formatCount(counts.escalations, "escalation packet")} before arbitration.`);
  }
  if (counts.needsSolverAction > 0) {
    nextActions.push(`Request solver updates for ${formatCount(counts.needsSolverAction, "milestone packet")}.`);
  }
  if (counts.readyForReview > 0) {
    nextActions.push(`Review ${formatCount(counts.readyForReview, "complete milestone packet")}.`);
  }

  return { counts, nextActions };
}

function createAuditDigest(packet) {
  const stableFacts = {
    teamId: packet.teamId,
    milestoneId: packet.milestoneId,
    decision: packet.decision,
    flags: [...(packet.flags || [])].sort(),
    missingEvidence: [...(packet.missingEvidence || [])].sort(),
    missingReviewerPacketItems: [...(packet.missingReviewerPacketItems || [])].sort(),
    overdueFeedbackRequests: normalizeWindows(packet.overdueFeedbackRequests || []),
    expiredResubmissionWindows: normalizeWindows(packet.expiredResubmissionWindows || []),
    riskScore: packet.riskScore,
  };
  return `cmpm_${crypto.createHash("sha256").update(JSON.stringify(stableFacts)).digest("hex").slice(0, 24)}`;
}

function normalizeWindows(windows) {
  return windows
    .map((window) => ({
      milestoneId: window.milestoneId,
      openedAt: window.openedAt,
      requestedAt: window.requestedAt,
      hoursOpen: window.hoursOpen,
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function hoursBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return Number.NaN;
  }
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
}

function roundHours(value) {
  return Math.round(value * 10) / 10;
}

function formatCount(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

module.exports = {
  auditChallengeMilestones,
  buildProgressSummary,
  createAuditDigest,
};
