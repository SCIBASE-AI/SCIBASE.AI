import { createHash } from "node:crypto";

export const DEFAULT_WEIGHTS = Object.freeze({
  fundingProof: 18,
  responsiveness: 14,
  rubricClarity: 15,
  timelineReadiness: 10,
  amendmentStability: 12,
  payoutHistory: 13,
  disputeResponsiveness: 8,
  ipNdaClarity: 10
});

const SENSITIVE_KEYS = new Set([
  "bankAccount",
  "identityDocuments",
  "internalContactEmail",
  "privateNotes",
  "taxId"
]);

const TIER_ORDER = ["trusted", "watch", "hold"];

export function buildSponsorScorecard(input, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sponsors = Array.isArray(input?.sponsors) ? input.sponsors : [];

  const scorecards = sponsors.flatMap((sponsor) => {
    const posts = Array.isArray(sponsor.challengePosts) ? sponsor.challengePosts : [];
    return posts.map((challenge) => evaluateChallenge(sponsor, challenge));
  });

  const summary = summarizeScorecards(scorecards);
  const sanitizedInputEcho = redactSensitiveFields(input);
  const digestPayload = {
    portfolioId: input?.portfolioId ?? null,
    asOf: input?.asOf ?? null,
    summary,
    scorecards: scorecards.map(toDigestableScorecard),
    sanitizedInputEcho
  };

  return {
    generatedAt,
    portfolioId: input?.portfolioId ?? "unknown-portfolio",
    summary,
    scorecards,
    sanitizedInputEcho,
    auditDigest: sha256(stableStringify(digestPayload))
  };
}

export function evaluateChallenge(sponsor, challenge) {
  const history = sponsor.history ?? {};
  const axisResults = {
    fundingProof: scoreFunding(challenge.funding),
    responsiveness: scoreResponsiveness(history, challenge),
    rubricClarity: scoreRubric(challenge.rubric),
    timelineReadiness: scoreTimeline(challenge.timeline, challenge.reviewSlaDays),
    amendmentStability: scoreAmendments(history, challenge.amendmentPolicy),
    payoutHistory: scorePayoutHistory(history),
    disputeResponsiveness: scoreDisputes(history, challenge.disputePolicy),
    ipNdaClarity: scoreIpNda(challenge.ipTerms, challenge.visibility)
  };

  const weightedScore = weightedAverage(axisResults, DEFAULT_WEIGHTS);
  const score = Math.round(weightedScore);
  const tier = tierForScore(score, axisResults);
  const findings = buildFindings(axisResults);
  const sponsorActions = buildSponsorActions(axisResults, tier);

  return {
    sponsorId: sponsor.sponsorId,
    sponsorName: sponsor.displayName ?? sponsor.sponsorId,
    sector: sponsor.sector ?? "unspecified",
    challengeId: challenge.challengeId,
    challengeTitle: challenge.title,
    prizeUsd: challenge.prizeUsd ?? null,
    score,
    tier,
    axisResults,
    findings,
    sponsorActions,
    solverGuidance: guidanceForTier(tier, findings),
    publicEvidenceDigest: sha256(stableStringify({
      sponsorId: sponsor.sponsorId,
      challengeId: challenge.challengeId,
      score,
      tier,
      axisResults: compactAxisResults(axisResults)
    }))
  };
}

export function redactSensitiveFields(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.has(key) ? "[redacted]" : redactSensitiveFields(entry)
    ])
  );
}

export function stableStringify(value) {
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

function scoreFunding(funding = {}) {
  const status = funding.status ?? "missing";
  const coverageRatio = clampNumber(funding.coverageRatio, 0, 1);
  const verified = status === "escrow_verified" && coverageRatio >= 1;

  if (verified) {
    return axis(100, "Funding proof", "Escrow or verified prize coverage is complete.", []);
  }

  if (status === "escrow_verified" && coverageRatio >= 0.75) {
    return axis(75, "Funding proof", "Funding is verified but coverage is below the full prize amount.", [
      action("warning", "Top up escrow or lower the published prize before accepting solvers.")
    ]);
  }

  if (status === "pledged") {
    return axis(48 + Math.round(coverageRatio * 18), "Funding proof", "Prize is pledged but not yet verified.", [
      action("blocker", "Verify funding or escrow coverage before routing this to solvers.")
    ]);
  }

  return axis(15, "Funding proof", "No usable funding proof is attached to the challenge.", [
    action("blocker", "Add verified funding proof before solvers begin work.")
  ]);
}

function scoreResponsiveness(history = {}, challenge = {}) {
  const medianFirstResponseHours = nullableNumber(history.medianFirstResponseHours);
  const expectedFirstResponseHours = nullableNumber(challenge.expectedFirstResponseHours);
  const onTimeReviewRate = clampNumber(history.onTimeReviewRate, 0, 1);
  const reviewSlaDays = nullableNumber(challenge.reviewSlaDays);

  let score = 100;
  if (medianFirstResponseHours == null || medianFirstResponseHours > 72) score -= 35;
  else if (medianFirstResponseHours > 48) score -= 24;
  else if (medianFirstResponseHours > 24) score -= 12;

  if (expectedFirstResponseHours == null || expectedFirstResponseHours > 72) score -= 20;
  else if (expectedFirstResponseHours > 48) score -= 12;

  if (onTimeReviewRate < 0.5) score -= 30;
  else if (onTimeReviewRate < 0.75) score -= 18;
  else if (onTimeReviewRate < 0.9) score -= 8;

  if (reviewSlaDays == null || reviewSlaDays > 21) score -= 20;
  else if (reviewSlaDays > 14) score -= 10;
  else if (reviewSlaDays > 7) score -= 5;

  const actions = [];
  if (reviewSlaDays == null || reviewSlaDays > 14) {
    actions.push(action("warning", "Publish a review SLA of 14 days or less."));
  }
  if (medianFirstResponseHours == null || medianFirstResponseHours > 48) {
    actions.push(action("warning", "Assign a sponsor contact who can respond within two business days."));
  }

  return axis(clampScore(score), "Review responsiveness", "Historical and published response windows for sponsor feedback.", actions);
}

function scoreRubric(rubric = {}) {
  const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];
  const measurableCount = criteria.filter((criterion) => criterion.measurable).length;
  const weightsTotal = criteria.reduce((total, criterion) => total + (Number(criterion.weight) || 0), 0);
  const evidenceRequirements = Array.isArray(rubric.evidenceRequirements) ? rubric.evidenceRequirements : [];

  let score = 20;
  if (criteria.length >= 3) score += 20;
  else if (criteria.length >= 2) score += 10;

  if (measurableCount === criteria.length && criteria.length > 0) score += 20;
  else if (measurableCount >= 2) score += 10;

  if (weightsTotal === 100) score += 15;
  else if (weightsTotal >= 90 && weightsTotal <= 110) score += 8;

  if (evidenceRequirements.length >= 2) score += 15;
  else if (evidenceRequirements.length === 1) score += 7;

  if (rubric.tieBreakerDefined) score += 10;
  if (rubric.judgingProtocolPublished) score += 10;

  const actions = [];
  if (criteria.length < 3) actions.push(action("blocker", "Define at least three evaluation criteria."));
  if (weightsTotal !== 100) actions.push(action("warning", "Normalize rubric weights to 100."));
  if (!rubric.tieBreakerDefined) actions.push(action("warning", "Publish a tie-break protocol before submissions open."));
  if (!rubric.judgingProtocolPublished) actions.push(action("warning", "Publish the judging protocol used for every submission."));

  return axis(clampScore(score), "Rubric clarity", "Measurable criteria, evidence requirements, and judging protocol completeness.", actions);
}

function scoreTimeline(timeline = {}, reviewSlaDays) {
  const milestones = nullableNumber(timeline.milestones) ?? 0;
  const submissionWindowDays = nullableNumber(timeline.submissionWindowDays);
  const sponsorReviewWindowDays = nullableNumber(timeline.sponsorReviewWindowDays);

  let score = 35;
  if (milestones >= 2) score += 20;
  else if (milestones === 1) score += 8;

  if (submissionWindowDays != null && submissionWindowDays >= 21) score += 15;
  else if (submissionWindowDays != null && submissionWindowDays >= 14) score += 8;

  if (sponsorReviewWindowDays != null && sponsorReviewWindowDays <= 14) score += 15;
  else if (sponsorReviewWindowDays != null && sponsorReviewWindowDays <= 21) score += 7;

  if (reviewSlaDays != null && sponsorReviewWindowDays != null && reviewSlaDays <= sponsorReviewWindowDays) {
    score += 15;
  }

  const actions = [];
  if (milestones < 2) actions.push(action("warning", "Split the challenge into at least two milestones for review and payout clarity."));
  if (submissionWindowDays == null || submissionWindowDays < 21) {
    actions.push(action("warning", "Give solvers enough calendar time for scientific work and replication."));
  }
  if (sponsorReviewWindowDays == null) {
    actions.push(action("blocker", "Set a sponsor review window before launch."));
  }

  return axis(clampScore(score), "Timeline readiness", "Milestones, submission window, and review windows are clear and realistic.", actions);
}

function scoreAmendments(history = {}, amendmentPolicy = {}) {
  const historicalAmendments = nullableNumber(history.materialAmendmentsAfterLaunch) ?? 0;
  const noticeDays = nullableNumber(amendmentPolicy.materialChangeNoticeDays);
  const maxMaterialAmendments = nullableNumber(amendmentPolicy.maxMaterialAmendments);

  let score = 100;
  if (historicalAmendments > 5) score -= 30;
  else if (historicalAmendments > 2) score -= 18;
  else if (historicalAmendments > 0) score -= 6;

  if (noticeDays == null || noticeDays < 2) score -= 20;
  else if (noticeDays < 5) score -= 8;

  if (!amendmentPolicy.solverWithdrawalProtected) score -= 25;
  if (maxMaterialAmendments == null || maxMaterialAmendments > 3) score -= 15;

  const actions = [];
  if (!amendmentPolicy.solverWithdrawalProtected) {
    actions.push(action("blocker", "Protect solver withdrawal or no-fault cancellation when material terms change."));
  }
  if (noticeDays == null || noticeDays < 2) {
    actions.push(action("warning", "Add advance notice for material challenge changes."));
  }

  return axis(clampScore(score), "Amendment stability", "Launch stability and solver protections for material changes.", actions);
}

function scorePayoutHistory(history = {}) {
  const paidAwards = nullableNumber(history.paidAwards) ?? 0;
  const averagePayoutLagDays = nullableNumber(history.averagePayoutLagDays);
  const cancelledAfterStart = nullableNumber(history.cancelledAfterStart) ?? 0;
  const completedChallenges = nullableNumber(history.completedChallenges) ?? 0;

  let score = 25;
  if (paidAwards >= 10) score += 30;
  else if (paidAwards >= 5) score += 22;
  else if (paidAwards >= 2) score += 14;
  else if (paidAwards === 1) score += 8;

  if (averagePayoutLagDays != null && averagePayoutLagDays <= 5) score += 25;
  else if (averagePayoutLagDays != null && averagePayoutLagDays <= 14) score += 16;
  else if (averagePayoutLagDays != null && averagePayoutLagDays <= 30) score += 7;

  if (completedChallenges >= 5) score += 15;
  else if (completedChallenges >= 2) score += 8;

  score -= Math.min(25, cancelledAfterStart * 10);

  const actions = [];
  if (paidAwards < 2) actions.push(action("warning", "Attach prior paid-award evidence or mark the sponsor as new."));
  if (averagePayoutLagDays == null || averagePayoutLagDays > 14) {
    actions.push(action("warning", "Publish a payout timeline and reduce average payout lag below 14 days."));
  }
  if (cancelledAfterStart > 0) {
    actions.push(action("warning", "Explain prior post-launch cancellations and add solver protections."));
  }

  return axis(clampScore(score), "Payout history", "Evidence of completed challenges and timely award settlement.", actions);
}

function scoreDisputes(history = {}, disputePolicy = {}) {
  const disputesOpened = nullableNumber(history.disputesOpened) ?? 0;
  const disputesResolvedWithinSla = nullableNumber(history.disputesResolvedWithinSla) ?? 0;
  const completedChallenges = Math.max(1, nullableNumber(history.completedChallenges) ?? 1);
  const disputeRate = disputesOpened / completedChallenges;

  let score = 100;
  if (disputeRate > 0.75) score -= 38;
  else if (disputeRate > 0.35) score -= 24;
  else if (disputeRate > 0.15) score -= 12;

  if (disputesOpened > 0) {
    const resolvedRate = disputesResolvedWithinSla / disputesOpened;
    if (resolvedRate < 0.35) score -= 28;
    else if (resolvedRate < 0.75) score -= 14;
  }

  if (disputePolicy.responseSlaDays == null || disputePolicy.responseSlaDays > 14) score -= 16;
  if (!disputePolicy.neutralReviewerAvailable) score -= 14;

  const actions = [];
  if (!disputePolicy.neutralReviewerAvailable) {
    actions.push(action("warning", "Name a neutral reviewer or arbitration fallback for disputes."));
  }
  if (disputePolicy.responseSlaDays == null || disputePolicy.responseSlaDays > 14) {
    actions.push(action("warning", "Set a dispute response SLA of 14 days or less."));
  }

  return axis(clampScore(score), "Dispute responsiveness", "Dispute rate, resolution speed, and neutral-review availability.", actions);
}

function scoreIpNda(ipTerms = {}, visibility = "public") {
  let score = 35;
  if (ipTerms.solverRetainsUntilPaid) score += 30;
  if (typeof ipTerms.licenseOnPayout === "string" && ipTerms.licenseOnPayout.length >= 8) score += 20;
  if (visibility === "public" || ipTerms.ndaTemplatePublished) score += 15;

  const actions = [];
  if (!ipTerms.solverRetainsUntilPaid) {
    actions.push(action("blocker", "State that solvers retain IP until payment is completed."));
  }
  if (visibility !== "public" && !ipTerms.ndaTemplatePublished) {
    actions.push(action("warning", "Publish the NDA template or provide a public summary of restricted terms."));
  }
  if (!ipTerms.licenseOnPayout) {
    actions.push(action("warning", "Define the license or transfer terms that apply after payout."));
  }

  return axis(clampScore(score), "IP and NDA clarity", "Solver rights, payout-triggered license terms, and private-challenge NDA clarity.", actions);
}

function weightedAverage(axisResults, weights) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return Object.entries(axisResults).reduce((sum, [key, result]) => {
    return sum + result.score * (weights[key] / totalWeight);
  }, 0);
}

function buildFindings(axisResults) {
  return Object.entries(axisResults)
    .flatMap(([axisName, result]) => {
      if (result.score >= 85 && result.actions.length === 0) {
        return [{
          severity: "info",
          axis: axisName,
          message: `${result.label} is ready.`,
          recommendedAction: "Keep current evidence visible to solvers."
        }];
      }

      return result.actions.map((entry) => ({
        severity: entry.severity,
        axis: axisName,
        message: result.summary,
        recommendedAction: entry.message
      }));
    })
    .sort((left, right) => severityRank(left.severity) - severityRank(right.severity));
}

function buildSponsorActions(axisResults, tier) {
  const actions = Object.values(axisResults)
    .flatMap((result) => result.actions)
    .sort((left, right) => severityRank(left.severity) - severityRank(right.severity))
    .map((entry) => entry.message);

  if (actions.length > 0) {
    return [...new Set(actions)];
  }

  if (tier === "trusted") {
    return ["Keep funding proof, rubric, review SLA, and IP terms visible on the challenge page."];
  }

  return ["Publish additional sponsor evidence before soliciting more solver work."];
}

function guidanceForTier(tier, findings) {
  if (tier === "trusted") {
    return "Ready for solver participation. Evidence is strong enough to open or promote the challenge.";
  }

  if (tier === "watch") {
    const firstWarning = findings.find((finding) => finding.severity !== "info");
    return `Proceed only after sponsor follow-up: ${firstWarning?.recommendedAction ?? "clear the listed warnings."}`;
  }

  const blocker = findings.find((finding) => finding.severity === "blocker");
  return `Hold solver onboarding until sponsor fixes: ${blocker?.recommendedAction ?? "the listed blockers."}`;
}

function summarizeScorecards(scorecards) {
  const byTier = Object.fromEntries(TIER_ORDER.map((tier) => [tier, 0]));
  let totalScore = 0;
  for (const card of scorecards) {
    byTier[card.tier] += 1;
    totalScore += card.score;
  }

  return {
    totalChallenges: scorecards.length,
    averageScore: scorecards.length ? Math.round(totalScore / scorecards.length) : 0,
    byTier
  };
}

function tierForScore(score, axisResults) {
  const hasBlocker = Object.values(axisResults).some((result) => {
    return result.actions.some((entry) => entry.severity === "blocker");
  });
  if (hasBlocker || score < 55) return "hold";
  if (score < 80) return "watch";
  return "trusted";
}

function compactAxisResults(axisResults) {
  return Object.fromEntries(
    Object.entries(axisResults).map(([key, value]) => [
      key,
      { score: value.score, label: value.label }
    ])
  );
}

function toDigestableScorecard(card) {
  return {
    sponsorId: card.sponsorId,
    challengeId: card.challengeId,
    score: card.score,
    tier: card.tier,
    axisResults: compactAxisResults(card.axisResults),
    sponsorActions: card.sponsorActions,
    solverGuidance: card.solverGuidance,
    publicEvidenceDigest: card.publicEvidenceDigest
  };
}

function axis(score, label, summary, actions) {
  return {
    score: clampScore(score),
    label,
    summary,
    actions
  };
}

function action(severity, message) {
  return { severity, message };
}

function severityRank(severity) {
  if (severity === "blocker") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function sha256(payload) {
  return createHash("sha256").update(payload).digest("hex");
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampNumber(value, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.max(minimum, Math.min(maximum, parsed));
}

function nullableNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
