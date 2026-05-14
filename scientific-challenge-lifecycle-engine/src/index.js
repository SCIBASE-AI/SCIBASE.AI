import { createHash } from "node:crypto";

const REQUIRED_CHALLENGE_FIELDS = [
  "id",
  "title",
  "scientificContext",
  "deliverables",
  "evaluationCriteria",
  "timeline",
  "prize",
  "ipPolicy",
];

const DEFAULT_VERTICAL_TEMPLATES = {
  biotech: ["dataset", "model", "validation-report", "ethics-note"],
  climate: ["forecast-model", "scenario-report", "reproducibility-notebook"],
  chemistry: ["protocol", "safety-sheet", "dataset", "analysis-notebook"],
  ml: ["model-card", "training-data-manifest", "evaluation-report"],
  materials: ["simulation-code", "property-dataset", "replication-plan"],
};

export function normalizeChallenge(challenge) {
  const missing = REQUIRED_CHALLENGE_FIELDS.filter((field) => !challenge[field]);
  if (missing.length > 0) {
    throw new Error(`challenge missing required fields: ${missing.join(", ")}`);
  }
  if (!Array.isArray(challenge.deliverables) || challenge.deliverables.length === 0) {
    throw new Error("challenge.deliverables must include at least one deliverable");
  }
  if (!Array.isArray(challenge.evaluationCriteria) || challenge.evaluationCriteria.length === 0) {
    throw new Error("challenge.evaluationCriteria must include at least one criterion");
  }

  const totalWeight = challenge.evaluationCriteria.reduce((sum, criterion) => {
    assertNumber(criterion.weight, `criterion ${criterion.id || criterion.name} weight`);
    return sum + criterion.weight;
  }, 0);
  if (Math.abs(totalWeight - 100) > 0.001) {
    throw new Error(`evaluation criteria weights must sum to 100, received ${totalWeight}`);
  }

  const verticalRequirements = DEFAULT_VERTICAL_TEMPLATES[challenge.vertical] || [];
  const normalizedDeliverables = challenge.deliverables.map((deliverable) => ({
    required: true,
    phase: "final",
    ...deliverable,
  }));

  return {
    visibility: "public",
    qualification: "open",
    ndaRequired: false,
    sponsor: {},
    ...challenge,
    deliverables: normalizedDeliverables,
    verticalTemplateRequirements: verticalRequirements,
    prize: {
      currency: "USD",
      escrowed: false,
      payoutSchedule: [{ milestone: "final", percent: 100 }],
      ...challenge.prize,
    },
  };
}

export function createSubmissionPackage(challengeInput, submission) {
  const challenge = normalizeChallenge(challengeInput);
  const submittedArtifacts = submission.artifacts || [];
  const artifactIndex = new Map(submittedArtifacts.map((artifact) => [artifact.type, artifact]));
  const deliverableCoverage = challenge.deliverables.map((deliverable) => {
    const artifact = artifactIndex.get(deliverable.type);
    return {
      deliverableId: deliverable.id,
      type: deliverable.type,
      phase: deliverable.phase,
      required: deliverable.required,
      submitted: Boolean(artifact),
      artifactId: artifact?.id || null,
      checksum: artifact ? stableHash(artifact) : null,
    };
  });

  const missingRequired = deliverableCoverage
    .filter((item) => item.required && !item.submitted)
    .map((item) => item.type);

  return {
    packageId: `${challenge.id}:${submission.id}`,
    challengeId: challenge.id,
    submissionId: submission.id,
    createdAt: submission.createdAt || new Date(0).toISOString(),
    anonymous: Boolean(submission.anonymous),
    team: submission.team || [],
    artifactManifest: submittedArtifacts.map((artifact) => ({
      id: artifact.id,
      type: artifact.type,
      filename: artifact.filename,
      checksum: stableHash(artifact),
      license: artifact.license || submission.defaultLicense || "unlisted",
    })),
    deliverableCoverage,
    missingRequired,
    reproducibility: summarizeReproducibility(submission.reproducibility || {}),
    auditHash: stableHash({
      challengeId: challenge.id,
      submissionId: submission.id,
      deliverableCoverage,
      artifacts: submittedArtifacts.map((artifact) => artifact.id),
    }),
  };
}

export function detectReviewerConflicts(submission, reviewers) {
  const teamUserIds = new Set((submission.team || []).map((member) => member.userId));
  const teamInstitutions = new Set(
    (submission.team || []).flatMap((member) => member.affiliations || []),
  );
  const sponsorInstitutions = new Set(submission.sponsorAffiliations || []);

  return reviewers.flatMap((reviewer) => {
    const reasons = [];
    if (teamUserIds.has(reviewer.userId)) reasons.push("reviewer_is_submitter");
    if ((reviewer.collaboratorIds || []).some((id) => teamUserIds.has(id))) {
      reasons.push("recent_collaboration");
    }
    if ((reviewer.affiliations || []).some((affiliation) => teamInstitutions.has(affiliation))) {
      reasons.push("shared_team_institution");
    }
    if ((reviewer.affiliations || []).some((affiliation) => sponsorInstitutions.has(affiliation))) {
      reasons.push("sponsor_affiliation");
    }
    return reasons.length > 0 ? [{ reviewerId: reviewer.userId, reasons }] : [];
  });
}

export function scoreSubmission(challengeInput, reviews) {
  const challenge = normalizeChallenge(challengeInput);
  if (!Array.isArray(reviews) || reviews.length === 0) {
    throw new Error("at least one review is required to score a submission");
  }

  const criterionById = new Map(challenge.evaluationCriteria.map((criterion) => [criterion.id, criterion]));
  const weightedScores = reviews.map((review) => {
    const normalizedReviewWeight = review.weight ?? 1;
    const score = Object.entries(review.scores || {}).reduce((sum, [criterionId, rawScore]) => {
      const criterion = criterionById.get(criterionId);
      if (!criterion) return sum;
      assertNumber(rawScore, `review score ${criterionId}`);
      const boundedScore = Math.max(0, Math.min(100, rawScore));
      return sum + (boundedScore * criterion.weight) / 100;
    }, 0);
    return { reviewerId: review.reviewerId, score, weight: normalizedReviewWeight };
  });

  const totalReviewWeight = weightedScores.reduce((sum, item) => sum + item.weight, 0);
  const finalScore =
    weightedScores.reduce((sum, item) => sum + item.score * item.weight, 0) / totalReviewWeight;

  return {
    finalScore: round(finalScore),
    threshold: challenge.acceptanceThreshold ?? 75,
    passed: finalScore >= (challenge.acceptanceThreshold ?? 75),
    reviewerScores: weightedScores.map((item) => ({
      reviewerId: item.reviewerId,
      score: round(item.score),
      weight: item.weight,
    })),
  };
}

export function buildPayoutPlan(challengeInput, scoring, submissionPackage, options = {}) {
  const challenge = normalizeChallenge(challengeInput);
  const blockingReasons = [];
  if (!challenge.prize.escrowed) blockingReasons.push("prize_not_escrowed");
  if (!scoring.passed) blockingReasons.push("score_below_threshold");
  if (submissionPackage.missingRequired.length > 0) blockingReasons.push("required_deliverables_missing");
  if ((options.conflicts || []).length > 0) blockingReasons.push("reviewer_conflicts_unresolved");
  if (submissionPackage.reproducibility.status === "failed") blockingReasons.push("reproducibility_failed");

  const payoutSchedule = challenge.prize.payoutSchedule.map((milestone) => ({
    milestone: milestone.milestone,
    amount: roundCurrency((challenge.prize.amount * milestone.percent) / 100),
    currency: challenge.prize.currency,
    percent: milestone.percent,
    ready:
      blockingReasons.length === 0 &&
      isMilestoneCovered(milestone.milestone, submissionPackage.deliverableCoverage),
  }));

  return {
    readyForPayout: blockingReasons.length === 0,
    blockingReasons,
    payoutSchedule,
    totalAmount: challenge.prize.amount,
    currency: challenge.prize.currency,
  };
}

export function resolveIpHandoff(challengeInput, payoutPlan, submission) {
  const challenge = normalizeChallenge(challengeInput);
  const policy = challenge.ipPolicy.mode;
  if (policy === "open") {
    return {
      status: "open_license_ready",
      license: challenge.ipPolicy.license || submission.defaultLicense || "CC-BY-4.0",
      action: "publish_open_submission_package",
    };
  }
  if (policy === "solver-retains-until-paid" && !payoutPlan.readyForPayout) {
    return {
      status: "solver_retains_ip",
      license: submission.defaultLicense || "solver-retained",
      action: "hold_transfer_until_payout_ready",
    };
  }
  if (policy === "sponsored-transfer" && payoutPlan.readyForPayout) {
    return {
      status: "transfer_ready",
      license: challenge.ipPolicy.targetLicense || "sponsor-exclusive",
      action: "execute_ip_transfer_on_payout",
    };
  }
  return {
    status: payoutPlan.readyForPayout ? "license_ready" : "license_pending",
    license: challenge.ipPolicy.license || "custom",
    action: payoutPlan.readyForPayout ? "release_license_terms" : "resolve_payout_blockers",
  };
}

export function runChallengeLifecycle(challengeInput, submission, reviewers, reviews) {
  const challenge = normalizeChallenge(challengeInput);
  const submissionPackage = createSubmissionPackage(challenge, submission);
  const conflicts = detectReviewerConflicts(submission, reviewers);
  const scoring = scoreSubmission(challenge, reviews);
  const payoutPlan = buildPayoutPlan(challenge, scoring, submissionPackage, { conflicts });
  const ipHandoff = resolveIpHandoff(challenge, payoutPlan, submission);

  return {
    challengeId: challenge.id,
    submissionId: submission.id,
    status: payoutPlan.readyForPayout ? "award_ready" : "needs_resolution",
    submissionPackage,
    conflicts,
    scoring,
    payoutPlan,
    ipHandoff,
    auditHash: stableHash({
      challengeId: challenge.id,
      submissionId: submission.id,
      scoring,
      payoutPlan,
      ipHandoff,
      conflicts,
    }),
  };
}

function summarizeReproducibility(reproducibility) {
  const checks = reproducibility.checks || [];
  if (checks.length === 0) {
    return { status: "not_provided", passed: 0, failed: 0, checks: [] };
  }
  const failed = checks.filter((check) => check.status !== "passed").length;
  return {
    status: failed === 0 ? "passed" : "failed",
    passed: checks.length - failed,
    failed,
    checks: checks.map((check) => ({
      id: check.id,
      status: check.status,
      evidence: check.evidence || null,
    })),
  };
}

function isMilestoneCovered(milestone, coverage) {
  return coverage
    .filter((item) => item.required && item.phase === milestone)
    .every((item) => item.submitted);
}

function stableHash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
