import crypto from "node:crypto";

const REVIEW_RATE_WINDOW_MINUTES = 30;
const REVIEW_RATE_THRESHOLD = 3;
const ENDORSEMENT_RING_WINDOW_MINUTES = 10;

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

export function evidenceHash(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16)}`;
}

export function computeReviewQuality(review) {
  const scoreValues = Object.values(review.scores ?? {});
  const averageScore = scoreValues.length ? scoreValues.reduce((total, value) => total + value, 0) / scoreValues.length : 0;
  const evidenceScore = Math.min(30, (review.evidenceAnchors?.length ?? 0) * 15);
  const detailScore = Math.min(30, Math.floor((review.wordCount ?? 0) / 20));
  const helpfulScore = Math.min(20, (review.helpfulVotes ?? 0) * 2);
  const balancePenalty = averageScore >= 4.8 && (review.wordCount ?? 0) < 100 ? 18 : 0;
  const flagPenalty = (review.flags?.length ?? 0) * 8;

  return Math.max(0, Math.min(100, Math.round(evidenceScore + detailScore + helpfulScore - balancePenalty - flagPenalty)));
}

export function detectReviewRateAnomalies(snapshot) {
  const reviewsByUser = groupBy(snapshot.reviews, (review) => review.reviewerId);
  const findings = [];

  for (const [userId, reviews] of reviewsByUser) {
    const sorted = [...reviews].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (let index = 0; index < sorted.length; index += 1) {
      const windowStart = new Date(sorted[index].createdAt).getTime();
      const windowReviews = sorted.filter((review) => {
        const createdAt = new Date(review.createdAt).getTime();
        return createdAt >= windowStart && createdAt <= windowStart + REVIEW_RATE_WINDOW_MINUTES * 60_000;
      });

      if (windowReviews.length >= REVIEW_RATE_THRESHOLD) {
        findings.push({
          type: "review-rate-anomaly",
          userId,
          severity: "high",
          reviewIds: windowReviews.map((review) => review.id),
          message: `${userId} submitted ${windowReviews.length} reviews inside ${REVIEW_RATE_WINDOW_MINUTES} minutes.`,
          evidenceHash: evidenceHash(windowReviews.map((review) => ({ id: review.id, createdAt: review.createdAt, wordCount: review.wordCount }))),
        });
        break;
      }
    }
  }

  return findings;
}

export function detectLowQualityReviewBursts(snapshot) {
  const lowQualityReviews = snapshot.reviews
    .map((review) => ({ review, quality: computeReviewQuality(review) }))
    .filter((item) => item.quality < 35);
  const byUser = groupBy(lowQualityReviews, (item) => item.review.reviewerId);

  return [...byUser.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([userId, items]) => ({
      type: "low-quality-review-burst",
      userId,
      severity: "medium",
      reviewIds: items.map((item) => item.review.id),
      qualities: items.map((item) => ({ reviewId: item.review.id, quality: item.quality })),
      message: `${userId} has ${items.length} recent reviews below the quality floor.`,
      evidenceHash: evidenceHash(items),
    }));
}

export function detectEndorsementRings(snapshot) {
  const findings = [];
  const endorsements = [...snapshot.endorsements].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const endorsement of endorsements) {
    const reciprocal = endorsements.find((candidate) => {
      if (candidate.id === endorsement.id) return false;
      if (candidate.from !== endorsement.to || candidate.to !== endorsement.from) return false;
      const delta = Math.abs(new Date(candidate.createdAt) - new Date(endorsement.createdAt));
      return delta <= ENDORSEMENT_RING_WINDOW_MINUTES * 60_000;
    });

    if (!reciprocal) continue;
    const key = [endorsement.from, endorsement.to].sort().join(":");
    if (findings.some((finding) => finding.ringKey === key)) continue;

    const ringEvents = [endorsement, reciprocal].sort((a, b) => a.id.localeCompare(b.id));
    findings.push({
      type: "reciprocal-endorsement-ring",
      ringKey: key,
      users: [endorsement.from, endorsement.to].sort(),
      severity: endorsement.weight >= 5 || reciprocal.weight >= 5 ? "high" : "medium",
      endorsementIds: ringEvents.map((event) => event.id),
      message: `Rapid reciprocal endorsements detected between ${endorsement.from} and ${endorsement.to}.`,
      evidenceHash: evidenceHash(ringEvents),
    });
  }

  return findings;
}

export function detectAnonymousSafetyIssues(snapshot) {
  const authorByProject = new Map(snapshot.projects.map((project) => [project.id, new Set(project.authors)]));
  const findings = [];

  for (const review of snapshot.reviews) {
    if (!["anonymous", "double-blind"].includes(review.mode)) continue;
    const projectAuthors = authorByProject.get(review.projectId) ?? new Set();
    const selfReview = projectAuthors.has(review.reviewerId);
    const weakBlindReview = review.wordCount < 100 || (review.evidenceAnchors?.length ?? 0) === 0;

    if (selfReview || weakBlindReview) {
      findings.push({
        type: "anonymous-review-safety",
        userId: review.reviewerId,
        severity: selfReview ? "high" : "medium",
        reviewId: review.id,
        reviewMode: review.mode,
        requiredAction: selfReview ? "block-self-review" : "request-evidence-anchors",
        message: selfReview
          ? "Anonymous review appears to target a project authored by the reviewer."
          : "Anonymous review needs stronger evidence anchors before reputation credit.",
        evidenceHash: evidenceHash({ reviewId: review.id, reviewerId: review.reviewerId, projectId: review.projectId }),
      });
    }
  }

  return findings;
}

export function buildAbuseReport(snapshot) {
  const findings = [
    ...detectReviewRateAnomalies(snapshot),
    ...detectLowQualityReviewBursts(snapshot),
    ...detectEndorsementRings(snapshot),
    ...detectAnonymousSafetyIssues(snapshot),
  ];

  return {
    snapshotId: snapshot.id,
    generatedAt: snapshot.generatedAt,
    findingCount: findings.length,
    highSeverityCount: findings.filter((finding) => finding.severity === "high").length,
    findings,
    reportHash: evidenceHash(findings),
  };
}

export function computeReputationAdjustments(snapshot) {
  const abuseReport = buildAbuseReport(snapshot);
  const adjustments = new Map(snapshot.users.map((user) => [user.id, { userId: user.id, baseReputation: user.baseReputation, penalty: 0, bonus: 0, reasons: [] }]));

  for (const review of snapshot.reviews) {
    const quality = computeReviewQuality(review);
    const adjustment = adjustments.get(review.reviewerId);
    if (!adjustment) continue;
    const qualityBonus = quality >= 70 ? 4 : quality >= 50 ? 2 : 0;
    adjustment.bonus += qualityBonus;
    if (qualityBonus) adjustment.reasons.push(`review-quality:${review.id}:${quality}`);
  }

  for (const finding of abuseReport.findings) {
    const impactedUsers = finding.userId ? [finding.userId] : finding.users ?? [];
    for (const userId of impactedUsers) {
      const adjustment = adjustments.get(userId);
      if (!adjustment) continue;
      const penalty = finding.severity === "high" ? 12 : 6;
      adjustment.penalty += penalty;
      adjustment.reasons.push(`${finding.type}:${finding.severity}`);
    }
  }

  return [...adjustments.values()].map((adjustment) => ({
    ...adjustment,
    adjustedReputation: Math.max(0, Math.min(100, adjustment.baseReputation + adjustment.bonus - adjustment.penalty)),
  }));
}

export function evaluateBadgeQuarantine(snapshot) {
  const adjustments = computeReputationAdjustments(snapshot);
  const report = buildAbuseReport(snapshot);

  return snapshot.users.map((user) => {
    const adjustment = adjustments.find((item) => item.userId === user.id);
    const activeFindings = report.findings.filter((finding) => finding.userId === user.id || finding.users?.includes(user.id));
    const frozenBadges = [];
    const eligibleBadges = [];

    for (const rule of snapshot.badgeRules) {
      const hasBadge = user.badges.includes(rule.badge);
      const activeFlagCount = activeFindings.length;
      const activeHighRiskCount = activeFindings.filter((finding) => finding.severity === "high").length;
      const reviews = snapshot.reviews.filter((review) => review.reviewerId === user.id);
      const averageQuality = reviews.length
        ? Math.round(reviews.reduce((total, review) => total + computeReviewQuality(review), 0) / reviews.length)
        : 0;
      const hasContribution = rule.requiredContribution
        ? snapshot.contributionEvents.some((event) => event.userId === user.id && event.role === rule.requiredContribution && event.verified)
        : true;
      const passes =
        (rule.minReputation === undefined || adjustment.adjustedReputation >= rule.minReputation) &&
        (rule.maxActiveFlags === undefined || activeHighRiskCount <= rule.maxActiveFlags) &&
        (rule.minReviews === undefined || reviews.length >= rule.minReviews || (hasBadge && reviews.length === 0)) &&
        (rule.minReviewQuality === undefined || reviews.length === 0 || averageQuality >= rule.minReviewQuality) &&
        hasContribution;

      if (hasBadge && !passes) {
        frozenBadges.push({ badge: rule.badge, reason: "guardrail-threshold-not-met", activeFlagCount, activeHighRiskCount, averageQuality });
      } else if (passes) {
        eligibleBadges.push(rule.badge);
      }
    }

    return {
      userId: user.id,
      adjustedReputation: adjustment.adjustedReputation,
      activeFindingCount: activeFindings.length,
      frozenBadges,
      eligibleBadges,
    };
  });
}

export function buildAppealPacket(snapshot, appealId) {
  const appeal = snapshot.appeals.find((item) => item.id === appealId) ?? snapshot.appeals[0];
  if (!appeal) {
    throw new Error("No appeal available");
  }
  const report = buildAbuseReport(snapshot);
  const adjustment = computeReputationAdjustments(snapshot).find((item) => item.userId === appeal.userId);
  const badgeDecision = evaluateBadgeQuarantine(snapshot).find((item) => item.userId === appeal.userId);
  const relevantFindings = report.findings.filter((finding) => finding.userId === appeal.userId || finding.users?.includes(appeal.userId));
  const recommendedResolution =
    relevantFindings.some((finding) => finding.type === "review-rate-anomaly") && appeal.evidence.includes("draft-expanded-review")
      ? "convert-penalty-to-review-revision-task"
      : "uphold-adjustment";

  return {
    appeal,
    relevantFindings,
    adjustment,
    badgeDecision,
    recommendedResolution,
    moderatorChecklist: [
      checklistItem("review submitted evidence", appeal.evidence.length > 0),
      checklistItem("compare findings to raw activity", relevantFindings.length > 0),
      checklistItem("preserve anonymous reviewer privacy", true),
      checklistItem("record final rationale", appeal.status !== "closed"),
    ],
    packetHash: evidenceHash({ appeal, relevantFindings, adjustment, badgeDecision, recommendedResolution }),
  };
}

export function buildModeratorQueue(snapshot) {
  const report = buildAbuseReport(snapshot);
  const appeals = snapshot.appeals.map((appeal) => buildAppealPacket(snapshot, appeal.id));
  const badgeDecisions = evaluateBadgeQuarantine(snapshot).filter((decision) => decision.frozenBadges.length > 0);

  const queueItems = [
    ...report.findings
      .filter((finding) => finding.severity === "high")
      .map((finding) => ({
        id: `finding:${finding.evidenceHash}`,
        type: finding.type,
        priority: "high",
        subject: finding.userId ?? finding.users?.join(","),
        summary: finding.message,
      })),
    ...appeals.map((packet) => ({
      id: `appeal:${packet.appeal.id}`,
      type: "appeal",
      priority: packet.relevantFindings.some((finding) => finding.severity === "high") ? "high" : "normal",
      subject: packet.appeal.userId,
      summary: packet.appeal.subject,
    })),
    ...badgeDecisions.map((decision) => ({
      id: `badge:${decision.userId}`,
      type: "badge-quarantine",
      priority: "normal",
      subject: decision.userId,
      summary: `${decision.frozenBadges.length} badge(s) require moderator review.`,
    })),
  ];

  return {
    snapshotId: snapshot.id,
    totalItems: queueItems.length,
    highPriorityItems: queueItems.filter((item) => item.priority === "high").length,
    queueItems,
    queueHash: evidenceHash(queueItems),
  };
}

export function buildTransparencyReport(snapshot) {
  const abuseReport = buildAbuseReport(snapshot);
  const adjustments = computeReputationAdjustments(snapshot);
  const badges = evaluateBadgeQuarantine(snapshot);
  const queue = buildModeratorQueue(snapshot);

  return {
    reportVersion: "reputation-abuse-appeals/v0.1",
    snapshotId: snapshot.id,
    generatedAt: snapshot.generatedAt,
    publicSummary: {
      reviewedUsers: snapshot.users.length,
      reviewedReviews: snapshot.reviews.length,
      reviewedEndorsements: snapshot.endorsements.length,
      findingCount: abuseReport.findingCount,
      frozenBadgeCount: badges.reduce((total, decision) => total + decision.frozenBadges.length, 0),
      appealsOpen: snapshot.appeals.filter((appeal) => appeal.status !== "closed").length,
    },
    abuseReport,
    adjustments,
    badges,
    moderatorQueue: queue,
    transparencyHash: evidenceHash({ abuseReport, adjustments, badges, queue }),
  };
}

function groupBy(values, getKey) {
  const groups = new Map();
  for (const value of values) {
    const key = getKey(value);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(value);
  }
  return groups;
}

function checklistItem(label, passed) {
  return { label, passed: Boolean(passed) };
}
