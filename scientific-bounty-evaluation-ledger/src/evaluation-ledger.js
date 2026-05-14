const REQUIRED_EVIDENCE = ["repository", "reproducibility", "demo", "license"];

export function normalizeChallenge(challenge) {
  if (!challenge || typeof challenge !== "object") {
    throw new TypeError("challenge must be an object");
  }

  const criteria = (challenge.criteria || []).map((criterion, index) => ({
    id: criterion.id || `criterion-${index + 1}`,
    label: criterion.label || `Criterion ${index + 1}`,
    weight: Number(criterion.weight ?? 1),
    minimum: Number(criterion.minimum ?? 0),
  }));

  if (!criteria.length) {
    throw new Error("challenge requires at least one criterion");
  }

  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("criteria weights must be positive");
  }

  return {
    id: challenge.id || slugify(challenge.title || "scientific-bounty"),
    title: challenge.title || "Untitled scientific bounty",
    budgetUsd: Number(challenge.budgetUsd || 0),
    acceptanceThreshold: Number(challenge.acceptanceThreshold ?? 0.82),
    arbitrationSpread: Number(challenge.arbitrationSpread ?? 0.25),
    requiredEvidence: challenge.requiredEvidence || REQUIRED_EVIDENCE,
    criteria,
    milestones: normalizeMilestones(challenge.milestones || [], challenge.budgetUsd || 0),
    ipPolicy: {
      transferOnAwardOnly: challenge.ipPolicy?.transferOnAwardOnly ?? true,
      licenseRequired: challenge.ipPolicy?.licenseRequired || "MIT OR Apache-2.0 compatible",
    },
  };
}

export function normalizeSubmission(submission) {
  if (!submission || typeof submission !== "object") {
    throw new TypeError("submission must be an object");
  }

  return {
    id: submission.id || slugify(submission.title || "submission"),
    title: submission.title || "Untitled submission",
    contributors: submission.contributors || [],
    affiliations: submission.affiliations || [],
    declaredRelationships: submission.declaredRelationships || [],
    evidence: submission.evidence || {},
    requestedMilestones: submission.requestedMilestones || [],
  };
}

export function validateEvidenceManifest(challengeInput, submissionInput) {
  const challenge = normalizeChallenge(challengeInput);
  const submission = normalizeSubmission(submissionInput);

  const checks = challenge.requiredEvidence.map((key) => {
    const value = submission.evidence[key];
    return {
      key,
      present: Boolean(value && String(value).trim()),
      value: value || null,
    };
  });

  return {
    complete: checks.every((check) => check.present),
    missing: checks.filter((check) => !check.present).map((check) => check.key),
    checks,
  };
}

export function detectReviewerConflicts(submissionInput, reviews) {
  const submission = normalizeSubmission(submissionInput);
  const contributorHandles = new Set(submission.contributors.map((name) => normalizeName(name)));
  const affiliations = new Set(submission.affiliations.map((name) => normalizeName(name)));
  const declared = new Set(submission.declaredRelationships.map((name) => normalizeName(name)));

  return reviews.flatMap((review) => {
    const conflicts = [];
    const reviewer = normalizeName(review.reviewer);
    if (contributorHandles.has(reviewer)) {
      conflicts.push("reviewer-is-contributor");
    }
    if ((review.affiliations || []).some((affiliation) => affiliations.has(normalizeName(affiliation)))) {
      conflicts.push("shared-affiliation");
    }
    if (declared.has(reviewer)) {
      conflicts.push("declared-relationship");
    }
    return conflicts.map((reason) => ({
      reviewer: review.reviewer,
      reason,
      severity: reason === "reviewer-is-contributor" ? "high" : "medium",
    }));
  });
}

export function scoreSubmission(challengeInput, reviews) {
  const challenge = normalizeChallenge(challengeInput);
  const normalizedReviews = reviews.map((review) => normalizeReview(challenge, review));

  const reviewerScores = normalizedReviews.map((review) => {
    const weighted = challenge.criteria.reduce((sum, criterion) => {
      return sum + review.scores[criterion.id] * criterion.weight;
    }, 0);
    const totalWeight = challenge.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    return {
      reviewer: review.reviewer,
      score: Number((weighted / totalWeight).toFixed(3)),
      notes: review.notes || "",
    };
  });

  const average = reviewerScores.reduce((sum, item) => sum + item.score, 0) / Math.max(1, reviewerScores.length);
  const spread = Math.max(...reviewerScores.map((item) => item.score)) - Math.min(...reviewerScores.map((item) => item.score));

  return {
    reviewerScores,
    average: Number(average.toFixed(3)),
    spread: Number(spread.toFixed(3)),
  };
}

export function evaluateBountySubmission(challengeInput, submissionInput, reviews) {
  const challenge = normalizeChallenge(challengeInput);
  const submission = normalizeSubmission(submissionInput);
  const evidence = validateEvidenceManifest(challenge, submission);
  const conflicts = detectReviewerConflicts(submission, reviews);
  const scoring = scoreSubmission(challenge, reviews);
  const decision = buildDecision(challenge, evidence, conflicts, scoring);
  const acceptanceRecord = buildAcceptanceRecord(challenge, submission, decision);
  const payout = buildPayoutReadiness(challenge, submission, decision, evidence, conflicts);

  return {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      budgetUsd: challenge.budgetUsd,
    },
    submission: {
      id: submission.id,
      title: submission.title,
      contributorCount: submission.contributors.length,
    },
    evidence,
    conflicts,
    scoring,
    decision,
    acceptanceRecord,
    payout,
  };
}

function buildDecision(challenge, evidence, conflicts, scoring) {
  const highConflicts = conflicts.filter((conflict) => conflict.severity === "high");
  if (highConflicts.length) {
    return {
      status: "arbitration_required",
      reason: "High-severity reviewer conflict detected.",
    };
  }

  if (!evidence.complete) {
    return {
      status: "revision_required",
      reason: `Missing evidence: ${evidence.missing.join(", ")}.`,
    };
  }

  if (scoring.spread >= challenge.arbitrationSpread) {
    return {
      status: "arbitration_required",
      reason: `Reviewer score spread ${scoring.spread} exceeds ${challenge.arbitrationSpread}.`,
    };
  }

  if (scoring.average >= challenge.acceptanceThreshold) {
    return {
      status: "award_recommended",
      reason: `Average score ${scoring.average} meets threshold ${challenge.acceptanceThreshold}.`,
    };
  }

  return {
    status: "revision_required",
    reason: `Average score ${scoring.average} is below threshold ${challenge.acceptanceThreshold}.`,
  };
}

function buildAcceptanceRecord(challenge, submission, decision) {
  const awardRecommended = decision.status === "award_recommended";
  return {
    submissionId: submission.id,
    ipTransferPermitted: awardRecommended && challenge.ipPolicy.transferOnAwardOnly,
    requiredLicense: challenge.ipPolicy.licenseRequired,
    acceptanceLanguage: awardRecommended
      ? "Award recommendation may proceed; IP/license acceptance can be recorded with explicit contributor confirmation."
      : "No IP transfer or exclusive rights acceptance should be recorded before award approval.",
  };
}

function buildPayoutReadiness(challenge, submission, decision, evidence, conflicts) {
  const blockers = [];
  if (decision.status !== "award_recommended") blockers.push(decision.reason);
  if (!evidence.complete) blockers.push(`Missing evidence: ${evidence.missing.join(", ")}`);
  if (conflicts.length) blockers.push("Reviewer conflict review required.");

  const requested = new Set(submission.requestedMilestones);
  const awards = challenge.milestones
    .filter((milestone) => !requested.size || requested.has(milestone.id))
    .map((milestone) => ({
      milestoneId: milestone.id,
      label: milestone.label,
      amountUsd: milestone.amountUsd,
    }));

  return {
    ready: blockers.length === 0,
    blockers,
    awards,
    totalRecommendedUsd: blockers.length ? 0 : awards.reduce((sum, award) => sum + award.amountUsd, 0),
  };
}

function normalizeReview(challenge, review) {
  const scores = {};
  for (const criterion of challenge.criteria) {
    const raw = review.scores?.[criterion.id];
    const value = Number(raw ?? 0);
    scores[criterion.id] = clamp(value, 0, 1);
  }
  return {
    reviewer: review.reviewer || "anonymous-reviewer",
    scores,
    notes: review.notes || "",
  };
}

function normalizeMilestones(milestones, budgetUsd) {
  if (milestones.length) {
    return milestones.map((milestone, index) => ({
      id: milestone.id || `milestone-${index + 1}`,
      label: milestone.label || `Milestone ${index + 1}`,
      amountUsd: Number(milestone.amountUsd || 0),
    }));
  }

  return [
    {
      id: "complete-delivery",
      label: "Complete accepted delivery",
      amountUsd: Number(budgetUsd || 0),
    },
  ];
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function slugify(value) {
  return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}
