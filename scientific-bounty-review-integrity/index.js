const crypto = require("crypto");

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

function sha256(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function assertArray(name, value) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
}

function validateRubric(rubric) {
  assertArray("challenge.rubric", rubric);
  const totalWeight = rubric.reduce((sum, item) => sum + item.weight, 0);
  const duplicateIds = rubric
    .map((item) => item.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  return {
    ok: totalWeight === 100 && duplicateIds.length === 0,
    totalWeight,
    duplicateIds: [...new Set(duplicateIds)],
  };
}

function buildEvidenceManifest(submission) {
  assertArray("submission.artifacts", submission.artifacts);

  return submission.artifacts.map((artifact) => ({
    id: artifact.id,
    type: artifact.type,
    name: artifact.name,
    hash: sha256({
      name: artifact.name,
      type: artifact.type,
      content: artifact.content,
      metadata: artifact.metadata || {},
    }),
    declaredLicense: artifact.license || null,
  }));
}

function findMissingDeliverables(challenge, submission) {
  const providedTypes = new Set(submission.artifacts.map((artifact) => artifact.type));
  return challenge.requiredDeliverables.filter((type) => !providedTypes.has(type));
}

function reviewerHasConflict(reviewer, submission) {
  const declared = new Set(reviewer.declaredConflicts || []);
  return (
    reviewer.teamId === submission.teamId ||
    reviewer.affiliation === submission.affiliation ||
    declared.has(submission.teamId) ||
    declared.has(submission.affiliation)
  );
}

function scoreSubmission(challenge, reviews) {
  const rubricById = new Map(challenge.rubric.map((item) => [item.id, item]));
  const acceptedReviews = reviews.filter((review) => review.status === "accepted");
  const scoreTotals = new Map();

  for (const review of acceptedReviews) {
    for (const [criterionId, value] of Object.entries(review.scores)) {
      const criterion = rubricById.get(criterionId);
      if (!criterion) {
        continue;
      }
      if (value < 0 || value > criterion.maxScore) {
        throw new RangeError(`${criterionId} score must be between 0 and ${criterion.maxScore}`);
      }
      const normalized = value / criterion.maxScore;
      const weighted = normalized * criterion.weight;
      scoreTotals.set(criterionId, (scoreTotals.get(criterionId) || 0) + weighted);
    }
  }

  const reviewCount = Math.max(acceptedReviews.length, 1);
  const weightedScore = [...scoreTotals.values()].reduce((sum, value) => sum + value, 0) / reviewCount;

  return {
    acceptedReviewCount: acceptedReviews.length,
    weightedScore: Number(weightedScore.toFixed(2)),
    passed: weightedScore >= challenge.passingScore,
  };
}

function buildMilestonePayouts(challenge, submission, score) {
  if (!score.passed) {
    return [];
  }

  assertArray("challenge.milestones", challenge.milestones);
  assertArray("submission.contributors", submission.contributors);

  const shareTotal = submission.contributors.reduce((sum, contributor) => sum + contributor.share, 0);
  if (shareTotal !== 100) {
    throw new RangeError("submission contributor shares must total 100");
  }

  return challenge.milestones.map((milestone) => ({
    milestoneId: milestone.id,
    amountUsd: milestone.amountUsd,
    status: "ready",
    recipients: submission.contributors.map((contributor) => ({
      contributorId: contributor.id,
      amountUsd: Number(((milestone.amountUsd * contributor.share) / 100).toFixed(2)),
    })),
  }));
}

function evaluateScientificBounty(challenge, submission, reviews) {
  assertArray("challenge.requiredDeliverables", challenge.requiredDeliverables);
  assertArray("reviews", reviews);

  const rubric = validateRubric(challenge.rubric);
  const evidenceManifest = buildEvidenceManifest(submission);
  const missingDeliverables = findMissingDeliverables(challenge, submission);
  const conflictReviews = reviews.filter((review) => reviewerHasConflict(review.reviewer, submission));
  const acceptedReviews = reviews
    .filter((review) => !reviewerHasConflict(review.reviewer, submission))
    .map((review) => ({...review, status: "accepted"}));
  const score = scoreSubmission(challenge, acceptedReviews);
  const blockers = [];

  if (!rubric.ok) {
    blockers.push("rubric_invalid");
  }
  if (missingDeliverables.length > 0) {
    blockers.push("missing_deliverables");
  }
  if (acceptedReviews.length < challenge.minimumIndependentReviews) {
    blockers.push("insufficient_independent_reviews");
  }
  if (!score.passed) {
    blockers.push("score_below_threshold");
  }

  const payoutPlan = blockers.length === 0 ? buildMilestonePayouts(challenge, submission, score) : [];

  return {
    challengeId: challenge.id,
    submissionId: submission.id,
    evidenceManifest,
    rubric,
    missingDeliverables,
    conflictReviewIds: conflictReviews.map((review) => review.id),
    score,
    blockers,
    payoutReadiness: blockers.length === 0 ? "ready_for_sponsor_approval" : "blocked",
    ipTransferState: blockers.length === 0 ? "eligible_after_payout" : "retained_by_solver",
    payoutPlan,
    auditHash: sha256({
      challengeId: challenge.id,
      submissionId: submission.id,
      evidenceManifest,
      score,
      blockers,
      payoutPlan,
    }),
  };
}

module.exports = {
  buildEvidenceManifest,
  evaluateScientificBounty,
  sha256,
  stableStringify,
};
