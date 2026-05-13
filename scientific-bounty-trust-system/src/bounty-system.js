const assertPercent = (value) => Number.isFinite(value) && value >= 0 && value <= 100;

const sum = (values) => values.reduce((total, value) => total + value, 0);

export function buildRubric(criteria) {
  const totalWeight = sum(criteria.map((item) => item.weight));
  return {
    criteria: criteria.map((item) => ({
      ...item,
      normalizedWeight: Number((item.weight / totalWeight).toFixed(4))
    })),
    maxScore: totalWeight,
    complete: totalWeight === 100
  };
}

export function deriveMilestonePayouts(challenge) {
  return challenge.phases.map((phase) => {
    if (!assertPercent(phase.prizePercent)) {
      throw new Error(`Invalid phase prize percent for ${phase.id}`);
    }
    return {
      phaseId: phase.id,
      amountUsd: Math.round((challenge.prizePoolUsd * phase.prizePercent) / 100),
      requiredDeliverables: phase.requiredDeliverables
    };
  });
}

export function buildChallengeContract(challenge) {
  const requiredFields = ["title", "sponsor", "timeline", "deliverables", "rubric", "prizePoolUsd", "escrow"];
  const missingFields = requiredFields.filter((field) => challenge[field] == null);
  const deliverableChecklist = challenge.deliverables.map((deliverable) => ({
    id: deliverable.id,
    required: deliverable.required,
    description: deliverable.description
  }));
  const rubric = buildRubric(challenge.rubric);
  const milestonePayouts = deriveMilestonePayouts(challenge);
  return {
    id: challenge.id,
    title: challenge.title,
    sponsor: challenge.sponsor,
    missingFields,
    accessPolicy: {
      visibility: challenge.visibility,
      ndaRequired: challenge.ndaRequired,
      participantMode: challenge.participantMode
    },
    timeline: challenge.timeline,
    deliverableChecklist,
    rubric,
    milestonePayouts,
    escrowReady: challenge.escrow?.funded === true,
    ipPolicy: challenge.ipPolicy,
    readyForPosting: missingFields.length === 0 && rubric.complete && challenge.escrow?.funded === true
  };
}

export function buildSubmissionPackage(challenge, submission) {
  const requiredIds = new Set(challenge.deliverables.filter((item) => item.required).map((item) => item.id));
  const artifactIndex = new Map(submission.artifacts.map((artifact) => [artifact.id, artifact]));
  const manifest = [...requiredIds].map((id) => {
    const artifact = artifactIndex.get(id);
    return {
      deliverableId: id,
      present: artifact?.present === true,
      checksum: artifact?.checksum ?? null,
      type: artifact?.type ?? null
    };
  });
  const missingDeliverables = manifest.filter((item) => !item.present).map((item) => item.deliverableId);
  return {
    id: submission.id,
    challengeId: submission.challengeId,
    team: submission.team,
    participantMode: submission.participantMode,
    disclosureLevel: submission.disclosureLevel,
    workspacePolicy: {
      sponsorCanViewBeforeAward: submission.disclosureLevel !== "protected-until-award",
      solverRetainsPrivateWorkspaceUntilDecision: submission.disclosureLevel === "protected-until-award"
    },
    manifest,
    artifactCount: submission.artifacts.length,
    auditLog: submission.auditLog,
    missingDeliverables,
    packageStatus: missingDeliverables.length === 0 ? "complete" : "incomplete"
  };
}

export function scoreSubmission(challenge, submission) {
  const rubric = buildRubric(challenge.rubric);
  const weightedScore = rubric.criteria.reduce((total, criterion) => {
    const raw = submission.scores[criterion.id] ?? 0;
    return total + Math.min(raw, criterion.weight);
  }, 0);
  const reviewerAverage =
    submission.reviewerVotes.length === 0
      ? 0
      : Math.round(sum(submission.reviewerVotes.map((vote) => vote.score)) / submission.reviewerVotes.length);
  return {
    rubricScore: weightedScore,
    reviewerAverage,
    finalScore: Math.round(weightedScore * 0.7 + reviewerAverage * 0.3)
  };
}

export function buildArbitrationCase(challenge, submission) {
  const packageReport = buildSubmissionPackage(challenge, submission);
  const score = scoreSubmission(challenge, submission);
  const checklist = packageReport.manifest.map((item) => ({
    item: item.deliverableId,
    status: item.present ? "passed" : "missing",
    evidence: item.checksum
  }));
  const awardRecommended =
    packageReport.packageStatus === "complete" &&
    score.finalScore >= 80 &&
    submission.reviewerVotes.every((vote) => vote.recommendation !== "reject");
  return {
    challengeId: challenge.id,
    submissionId: submission.id,
    checklist,
    reviewerVotes: submission.reviewerVotes,
    sponsorFeedback: submission.sponsorFeedback,
    score,
    decision: awardRecommended ? "award-with-feedback" : "needs-revision",
    rationale: awardRecommended
      ? "Submission is complete, reviewer scores meet threshold, and sponsor feedback is addressable."
      : "Submission is missing required evidence or did not meet award threshold."
  };
}

export function resolveIpTerms(challenge, submission, arbitration) {
  const election = submission.ipElection ?? challenge.ipPolicy;
  if (election === "open") {
    return {
      status: "open-on-merge",
      transferCondition: "Submission artifacts may be published under the selected open license."
    };
  }
  if (election === "transfer-upon-payout") {
    return {
      status: arbitration.decision.startsWith("award") ? "pending-payout" : "solver-retains",
      transferCondition: "Sponsor receives IP rights only after platform confirms payout release."
    };
  }
  return {
    status: "solver-retains",
    transferCondition: "Solver retains IP unless a separate paid license is executed."
  };
}

export function routePayouts(challenge, submission, arbitration) {
  if (!challenge.escrow?.funded) {
    return { status: "blocked", reason: "Escrow is not funded.", payments: [] };
  }
  if (!arbitration.decision.startsWith("award")) {
    return { status: "held", reason: "Arbitration has not recommended an award.", payments: [] };
  }
  const winnerAmount = Math.round(challenge.prizePoolUsd * 0.9);
  const institutionShare = submission.team.institution?.payoutShare ?? 0;
  const institutionAmount = Math.round((winnerAmount * institutionShare) / 100);
  const memberPool = winnerAmount - institutionAmount;
  const memberPayments = submission.team.members.map((member) => ({
    recipientId: member.id,
    recipientType: "individual",
    amountUsd: Math.round((memberPool * member.payoutShare) / 100),
    reason: "winner-share"
  }));
  const payments = [
    ...memberPayments,
    ...(institutionAmount > 0
      ? [
          {
            recipientId: submission.team.institution.id,
            recipientType: "institution",
            amountUsd: institutionAmount,
            reason: "institution-overhead"
          }
        ]
      : []),
    {
      recipientId: submission.team.id,
      recipientType: "team",
      amountUsd: challenge.prizePoolUsd - winnerAmount,
      reason: "milestone-and-honorable-pool"
    }
  ];
  return {
    status: "ready-for-release",
    escrowReference: challenge.escrow.reference,
    payments,
    totalRoutedUsd: sum(payments.map((payment) => payment.amountUsd))
  };
}

export function buildBountyDashboard(challenge, submission) {
  const contract = buildChallengeContract(challenge);
  const submissionPackage = buildSubmissionPackage(challenge, submission);
  const arbitration = buildArbitrationCase(challenge, submission);
  const ipTerms = resolveIpTerms(challenge, submission, arbitration);
  const payoutRouting = routePayouts(challenge, submission, arbitration);
  return {
    challenge: contract,
    submission: submissionPackage,
    arbitration,
    ipTerms,
    payoutRouting,
    trustStatus:
      contract.readyForPosting &&
      submissionPackage.packageStatus === "complete" &&
      payoutRouting.status === "ready-for-release" &&
      ipTerms.status === "pending-payout"
        ? "protected-award-ready"
        : "needs-operator-review"
  };
}
