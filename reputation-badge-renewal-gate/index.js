const DAY_MS = 24 * 60 * 60 * 1000;

function evaluateBadgeRenewals(policy, researchers) {
  const generatedAt = new Date(`${policy.generatedAt}T00:00:00.000Z`);
  const packets = researchers.flatMap((researcher) =>
    researcher.activeBadges.map((badge) => evaluateBadge(policy, generatedAt, researcher, badge)),
  );

  const summary = packets.reduce(
    (acc, packet) => {
      acc.total += 1;
      acc[packet.decision] += 1;
      return acc;
    },
    { total: 0, renew: 0, review: 0, downgrade: 0, expire: 0 },
  );

  return {
    generatedAt: policy.generatedAt,
    summary,
    packets,
  };
}

function evaluateBadge(policy, generatedAt, researcher, badge) {
  const windowDays = policy.renewalWindowsDays[badge] || 120;
  const minimum = policy.minimums[badge] || {
    reviews: 1,
    averageReviewQuality: 0.7,
    reproducibilityEvents: 0,
    creditEvents: 1,
  };

  const evidence = collectEvidence(researcher, windowDays);
  const findings = [];

  if (evidence.recentReviews.length < minimum.reviews) {
    findings.push(
      issue(
        "missing-review-volume",
        `Needs ${minimum.reviews} recent reviews; found ${evidence.recentReviews.length}.`,
        "renewal",
      ),
    );
  }

  if (evidence.averageReviewQuality < minimum.averageReviewQuality) {
    findings.push(
      issue(
        "review-quality-below-threshold",
        `Average review quality ${formatScore(evidence.averageReviewQuality)} is below ${formatScore(
          minimum.averageReviewQuality,
        )}.`,
        "quality",
      ),
    );
  }

  if (evidence.recentReproducibility.length < minimum.reproducibilityEvents) {
    findings.push(
      issue(
        "stale-reproducibility-evidence",
        `Needs ${minimum.reproducibilityEvents} recent verified reproducibility events; found ${evidence.recentReproducibility.length}.`,
        "reproducibility",
      ),
    );
  }

  if (evidence.recentCredits.length < minimum.creditEvents) {
    findings.push(
      issue(
        "insufficient-contribution-continuity",
        `Needs ${minimum.creditEvents} recent contribution credits; found ${evidence.recentCredits.length}.`,
        "credit",
      ),
    );
  }

  const openAppeals = researcher.appeals.filter((appeal) => appeal.status === "open");
  if (openAppeals.length > 0) {
    findings.push(
      issue(
        "open-appeal-hold",
        `${openAppeals.length} open appeal(s) require reviewer action before badge renewal.`,
        "moderation",
      ),
    );
  }

  const anonymousReviewCount = evidence.recentReviews.filter((event) =>
    ["anonymous", "double-blind"].includes(event.mode),
  ).length;

  const score = scorePacket(evidence, findings, minimum, anonymousReviewCount);
  const decision = chooseDecision(score, findings, evidence, minimum, openAppeals.length);

  return {
    researcherId: researcher.id,
    displayName: researcher.displayName,
    badge,
    decision,
    score,
    renewalWindowDays: windowDays,
    evidence: {
      reviewCount: evidence.recentReviews.length,
      averageReviewQuality: Number(evidence.averageReviewQuality.toFixed(3)),
      reproducibilityCount: evidence.recentReproducibility.length,
      creditCount: evidence.recentCredits.length,
      anonymousReviewCount,
      openAppealCount: openAppeals.length,
      oldestRecentEvidenceDays: evidence.oldestRecentEvidenceDays,
    },
    findings,
    requiredActions: buildRequiredActions(decision, findings),
  };
}

function collectEvidence(researcher, windowDays) {
  const recentReviews = researcher.reviewEvents.filter((event) => event.daysAgo <= windowDays);
  const recentReproducibility = researcher.reproducibilityEvents.filter(
    (event) => event.daysAgo <= windowDays && event.status === "verified",
  );
  const recentCredits = researcher.creditEvents.filter((event) => event.daysAgo <= windowDays);
  const averageReviewQuality =
    recentReviews.length === 0
      ? 0
      : recentReviews.reduce((total, event) => total + event.quality, 0) / recentReviews.length;
  const allRecentAges = [...recentReviews, ...recentReproducibility, ...recentCredits].map(
    (event) => event.daysAgo,
  );

  return {
    recentReviews,
    recentReproducibility,
    recentCredits,
    averageReviewQuality,
    oldestRecentEvidenceDays: allRecentAges.length === 0 ? null : Math.max(...allRecentAges),
  };
}

function scorePacket(evidence, findings, minimum, anonymousReviewCount) {
  const reviewScore = Math.min(evidence.recentReviews.length / minimum.reviews, 1) * 30;
  const qualityScore = Math.min(evidence.averageReviewQuality / minimum.averageReviewQuality, 1) * 25;
  const reproducibilityScore =
    minimum.reproducibilityEvents === 0
      ? 20
      : Math.min(evidence.recentReproducibility.length / minimum.reproducibilityEvents, 1) * 20;
  const creditScore = Math.min(evidence.recentCredits.length / minimum.creditEvents, 1) * 15;
  const privacyBonus = anonymousReviewCount > 0 ? 5 : 0;
  const penalty = findings.reduce((total, finding) => {
    if (finding.category === "moderation") return total + 35;
    if (finding.category === "quality") return total + 20;
    return total + 12;
  }, 0);

  return Math.max(0, Math.round(reviewScore + qualityScore + reproducibilityScore + creditScore + privacyBonus - penalty));
}

function chooseDecision(score, findings, evidence, minimum, openAppealCount) {
  if (openAppealCount > 0) return "review";
  if (score >= 82 && findings.length === 0) return "renew";
  if (score >= 60) return "review";

  const hasNoCoreEvidence =
    evidence.recentReviews.length === 0 &&
    evidence.recentReproducibility.length < minimum.reproducibilityEvents &&
    evidence.recentCredits.length < minimum.creditEvents;

  return hasNoCoreEvidence || score < 35 ? "expire" : "downgrade";
}

function buildRequiredActions(decision, findings) {
  if (decision === "renew") {
    return ["Record renewal packet and keep badge visible on profile and leaderboard surfaces."];
  }

  const actions = findings.map((finding) => {
    if (finding.code === "missing-review-volume") return "Complete additional structured peer reviews.";
    if (finding.code === "review-quality-below-threshold") return "Request calibration or mentor review before renewal.";
    if (finding.code === "stale-reproducibility-evidence") return "Add recent verified reproducibility evidence.";
    if (finding.code === "insufficient-contribution-continuity") return "Attach recent CRediT contribution evidence.";
    if (finding.code === "open-appeal-hold") return "Resolve open appeal before public badge renewal.";
    return "Review badge evidence manually.";
  });

  if (decision === "expire") {
    actions.push("Hide badge from public leaderboard surfaces until renewed.");
  }
  if (decision === "downgrade") {
    actions.push("Move badge to lower confidence tier and show renewal requirements.");
  }

  return [...new Set(actions)];
}

function issue(code, message, category) {
  return { code, message, category };
}

function formatScore(value) {
  return value.toFixed(2);
}

module.exports = {
  evaluateBadgeRenewals,
  evaluateBadge,
  collectEvidence,
};
