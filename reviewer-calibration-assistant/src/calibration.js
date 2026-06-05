const DEFAULT_THRESHOLDS = {
  minimumPairwiseAgreement: 0.68,
  severeScoreSpread: 2,
  actionConsensusRatio: 0.67,
  requiredEvidenceCoverage: 0.75,
  requireBlindModeForDisputedReviews: true
};

const ACTION_RANK = {
  accept: 4,
  minor_revision: 3,
  major_revision: 2,
  reject: 1
};

const SCORE_FIELDS = ["clarity", "rigor", "novelty", "reproducibility"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unique(values) {
  return [...new Set(values)];
}

function mode(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0];
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function scoreSpread(reviews, field) {
  const scores = reviews.map((review) => Number(review.scores?.[field] ?? 0));
  return Math.max(...scores) - Math.min(...scores);
}

function reviewVector(review) {
  const scoreValues = SCORE_FIELDS.map((field) => Number(review.scores?.[field] ?? 0));
  const actionValue = ACTION_RANK[review.recommendation] ?? 0;
  return [...scoreValues, actionValue];
}

function pairAgreement(left, right) {
  const leftVector = reviewVector(left);
  const rightVector = reviewVector(right);
  const distances = leftVector.map((value, index) => Math.abs(value - rightVector[index]) / 4);
  return clamp(1 - average(distances), 0, 1);
}

function buildPairs(reviews) {
  const pairs = [];
  for (let i = 0; i < reviews.length; i += 1) {
    for (let j = i + 1; j < reviews.length; j += 1) {
      pairs.push({
        reviewers: [reviews[i].reviewerId, reviews[j].reviewerId],
        agreement: Number(pairAgreement(reviews[i], reviews[j]).toFixed(3))
      });
    }
  }
  return pairs;
}

function evidenceCoverage(review) {
  const claims = review.claimChecks || [];
  if (claims.length === 0) return 0;
  const supported = claims.filter((claim) => claim.evidenceIds?.length > 0).length;
  return supported / claims.length;
}

function detectDomainTemplateDrift(packet) {
  const expected = packet.domainTemplate;
  return packet.reviews
    .filter((review) => review.template !== expected)
    .map((review) => ({
      reviewerId: review.reviewerId,
      expectedTemplate: expected,
      actualTemplate: review.template || "missing"
    }));
}

function detectEvidenceGaps(packet, thresholds) {
  return packet.reviews
    .map((review) => ({
      reviewerId: review.reviewerId,
      coverage: Number(evidenceCoverage(review).toFixed(3))
    }))
    .filter((review) => review.coverage < thresholds.requiredEvidenceCoverage);
}

function detectScoreDivergence(reviews, thresholds) {
  return SCORE_FIELDS
    .map((field) => ({ field, spread: scoreSpread(reviews, field) }))
    .filter((item) => item.spread >= thresholds.severeScoreSpread);
}

function detectBlindModeRisk(packet, thresholds, scoreDivergence, pairwiseAgreement) {
  if (!thresholds.requireBlindModeForDisputedReviews) return null;
  if (packet.reviewMode === "double_blind") return null;
  if (scoreDivergence.length === 0 && pairwiseAgreement >= thresholds.minimumPairwiseAgreement) return null;
  return {
    reviewMode: packet.reviewMode || "missing",
    reason: "disputed review packet should remain double-blind until calibration is complete"
  };
}

export function evaluateReviewerCalibration(packet, customThresholds = {}) {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  if (!packet || !Array.isArray(packet.reviews) || packet.reviews.length < 2) {
    throw new Error("Reviewer calibration requires at least two review records.");
  }

  const duplicateReviewers = unique(
    packet.reviews
      .map((review) => review.reviewerId)
      .filter((reviewerId, index, all) => all.indexOf(reviewerId) !== index)
  );
  const pairs = buildPairs(packet.reviews);
  const pairwiseAgreement = Number(average(pairs.map((pair) => pair.agreement)).toFixed(3));
  const [consensusAction, consensusCount] = mode(packet.reviews.map((review) => review.recommendation));
  const consensusRatio = Number((consensusCount / packet.reviews.length).toFixed(3));
  const scoreDivergence = detectScoreDivergence(packet.reviews, thresholds);
  const templateDrift = detectDomainTemplateDrift(packet);
  const evidenceGaps = detectEvidenceGaps(packet, thresholds);
  const blindModeRisk = detectBlindModeRisk(packet, thresholds, scoreDivergence, pairwiseAgreement);

  const blockers = [];
  if (duplicateReviewers.length) blockers.push("duplicate_reviewer_records");
  if (pairwiseAgreement < thresholds.minimumPairwiseAgreement) blockers.push("low_inter_rater_agreement");
  if (consensusRatio < thresholds.actionConsensusRatio) blockers.push("weak_recommendation_consensus");
  if (scoreDivergence.length) blockers.push("severe_score_divergence");
  if (templateDrift.length) blockers.push("domain_template_drift");
  if (evidenceGaps.length) blockers.push("insufficient_evidence_coverage");
  if (blindModeRisk) blockers.push("blind_mode_escalation_required");

  return {
    projectId: packet.projectId,
    manuscriptId: packet.manuscriptId,
    reviewerCount: packet.reviews.length,
    reviewMode: packet.reviewMode,
    consensusAction,
    consensusRatio,
    pairwiseAgreement,
    pairwiseDetails: pairs,
    scoreDivergence,
    templateDrift,
    evidenceGaps,
    blindModeRisk,
    duplicateReviewers,
    blockers,
    decision: blockers.length ? "calibrate_before_release" : "release_review_summary",
    nextActions: buildNextActions(blockers)
  };
}

function buildNextActions(blockers) {
  const actionMap = {
    duplicate_reviewer_records: "Remove duplicate reviewer entries before reputation or review-summary updates.",
    low_inter_rater_agreement: "Run reviewer calibration on divergent scoring dimensions before author-facing release.",
    weak_recommendation_consensus: "Request adjudication because recommendation consensus is below threshold.",
    severe_score_divergence: "Ask reviewers to justify high-spread score dimensions with evidence anchors.",
    domain_template_drift: "Normalize all reviews to the configured domain template.",
    insufficient_evidence_coverage: "Require evidence anchors for unsupported claim checks.",
    blind_mode_escalation_required: "Keep disputed packets double-blind until calibration is resolved."
  };
  return blockers.map((blocker) => actionMap[blocker]);
}

export function renderMarkdownReport(result) {
  const rows = [
    ["Project", result.projectId],
    ["Manuscript", result.manuscriptId],
    ["Reviewers", result.reviewerCount],
    ["Decision", result.decision],
    ["Pairwise agreement", result.pairwiseAgreement],
    ["Consensus action", `${result.consensusAction} (${result.consensusRatio})`]
  ];
  const summary = rows.map(([label, value]) => `| ${label} | ${value} |`).join("\n");
  const blockers = result.blockers.length
    ? result.blockers.map((blocker) => `- ${blocker}`).join("\n")
    : "- none";
  const actions = result.nextActions.length
    ? result.nextActions.map((action) => `- ${action}`).join("\n")
    : "- Review packet can be released.";

  return [
    "# Reviewer Calibration Assistant Report",
    "",
    "| Field | Value |",
    "| --- | --- |",
    summary,
    "",
    "## Blockers",
    blockers,
    "",
    "## Required Actions",
    actions,
    ""
  ].join("\n");
}
