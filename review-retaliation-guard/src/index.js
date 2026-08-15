"use strict";

const CRITICAL_RECOMMENDATIONS = new Set([
  "reject",
  "major_revision",
  "major revisions",
  "not_recommended",
  "do_not_accept"
]);

const PUNITIVE_ACTIONS = new Set([
  "downvote",
  "reputation_penalty",
  "badge_removed",
  "endorsement_withdrawn",
  "role_revoked",
  "account_flag",
  "reviewer_blocked",
  "profile_visibility_reduced"
]);

const COERCION_PATTERNS = [
  /\bchange\s+your\s+review\b/i,
  /\bwithdraw\s+your\s+criticism\b/i,
  /\bremove\s+the\s+negative\s+comment\b/i,
  /\bunless\s+you\s+revise\b/i,
  /\breputation\s+will\s+drop\b/i,
  /\bwe\s+will\s+penalize\b/i
];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDate(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

function daysBetween(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled reputation packet",
    reviewDate: packet.reviewDate || packet.review?.submittedAt || "2026-08-15",
    review: packet.review || {},
    reputationEvents: list(packet.reputationEvents),
    manuscript: packet.manuscript || {},
    safeguards: packet.safeguards || {},
    exportTarget: packet.exportTarget || {}
  };
}

function isCriticalReview(review) {
  const recommendation = normalizeText(review.recommendation).replace(/\s+/g, "_");
  if (CRITICAL_RECOMMENDATIONS.has(recommendation)) return true;
  if (review.rating !== undefined && Number(review.rating) <= 2) return true;
  if (Number(review.criticalityScore || 0) >= 0.7) return true;
  return normalizeText(review.tone) === "critical";
}

function actorRelation(event, packet) {
  const relation = normalizeText(event.actorRelation);
  if (relation) return relation;

  const authors = new Set(list(packet.manuscript.authors).map(normalizeText));
  const institutions = new Set(list(packet.manuscript.institutions).map(normalizeText));
  const actor = normalizeText(event.actor);
  const institution = normalizeText(event.actorInstitution);

  if (authors.has(actor)) return "author";
  if (institution && institutions.has(institution)) return "same_institution";
  return "unaffiliated";
}

function isAffiliatedRelation(relation) {
  return [
    "author",
    "coauthor",
    "same_institution",
    "same_lab",
    "project_collaborator",
    "funder",
    "study_team"
  ].includes(relation);
}

function isPunitiveEvent(event) {
  if (PUNITIVE_ACTIONS.has(normalizeText(event.action))) return true;
  return Number(event.reputationDelta || 0) < 0;
}

function targetsReviewer(event, reviewerId) {
  const reviewer = normalizeText(reviewerId);
  if (!reviewer) return false;
  return [
    event.targetReviewer,
    event.targetReviewerId,
    event.targetUser,
    event.targetContributionOwner
  ].some((value) => normalizeText(value) === reviewer);
}

function hasCoerciveLanguage(event) {
  const text = `${event.note || ""} ${event.message || ""} ${event.reason || ""}`;
  return COERCION_PATTERNS.some((pattern) => pattern.test(text));
}

function scoreFindings(findings) {
  const score = findings.reduce((total, item) => {
    if (item.severity === "critical") return total + 35;
    if (item.severity === "major") return total + 22;
    return total + 10;
  }, 0);
  return Math.min(100, score);
}

function decisionFor(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD";
  if (findings.some((item) => item.severity === "major")) return "REVIEW";
  return "CLEAR";
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const findings = [];
  const reviewerId = packet.review.reviewerId || packet.review.reviewer;
  const criticalReview = isCriticalReview(packet.review);
  const retaliationWindowDays = Number(packet.safeguards.retaliationWindowDays || 35);

  const relevantEvents = packet.reputationEvents.map((event) => {
    const relation = actorRelation(event, packet);
    const daysAfterReview = daysBetween(packet.reviewDate, event.createdAt);
    return {
      ...event,
      relation,
      daysAfterReview,
      punitive: isPunitiveEvent(event),
      targetsReviewer: targetsReviewer(event, reviewerId),
      coerciveLanguage: hasCoerciveLanguage(event),
      inRetaliationWindow: daysAfterReview !== null && daysAfterReview >= 0 && daysAfterReview <= retaliationWindowDays
    };
  });

  const suspiciousEvents = relevantEvents.filter((event) => (
    criticalReview &&
    event.punitive &&
    event.targetsReviewer &&
    event.inRetaliationWindow &&
    isAffiliatedRelation(event.relation)
  ));

  for (const event of suspiciousEvents) {
    findings.push(finding(
      "AFFILIATED_PUNITIVE_ACTION_AFTER_CRITICAL_REVIEW",
      "critical",
      "An author-affiliated actor applied a punitive reputation action shortly after a critical review.",
      {
        action: event.action,
        actor: event.actor,
        relation: event.relation,
        targetReviewer: reviewerId,
        daysAfterReview: event.daysAfterReview,
        reputationDelta: event.reputationDelta || 0
      },
      "Freeze the reputation delta and route the action to an independent moderator before publication or profile export."
    ));
  }

  const coerciveEvents = relevantEvents.filter((event) => (
    event.targetsReviewer &&
    event.inRetaliationWindow &&
    event.coerciveLanguage
  ));

  for (const event of coerciveEvents) {
    findings.push(finding(
      "COERCIVE_REVIEW_REVISION_SIGNAL",
      "critical",
      "A reputation event contains language that appears to pressure the reviewer to soften or alter criticism.",
      {
        actor: event.actor,
        action: event.action,
        daysAfterReview: event.daysAfterReview,
        excerpt: String(event.message || event.note || event.reason || "").slice(0, 160)
      },
      "Separate reputation handling from manuscript-review negotiation and preserve the message for moderator review."
    ));
  }

  const punitiveActorCount = new Set(suspiciousEvents.map((event) => normalizeText(event.actor))).size;
  if (punitiveActorCount >= 2) {
    findings.push(finding(
      "RECIPROCAL_OR_CLUSTERED_RETALIATION_BURST",
      "critical",
      "Multiple affiliated actors targeted the same reviewer within the retaliation window.",
      {
        affectedReviewer: reviewerId,
        distinctActors: punitiveActorCount,
        events: suspiciousEvents.map((event) => ({ actor: event.actor, action: event.action, daysAfterReview: event.daysAfterReview }))
      },
      "Escalate as a retaliation cluster, suspend automated scoring, and require independent adjudication."
    ));
  }

  const badgeWithdrawals = suspiciousEvents.filter((event) => [
    "badge_removed",
    "endorsement_withdrawn",
    "role_revoked",
    "profile_visibility_reduced"
  ].includes(normalizeText(event.action)));

  if (badgeWithdrawals.length > 0) {
    findings.push(finding(
      "PROFILE_CREDIT_REMOVED_AFTER_UNFAVORABLE_REVIEW",
      "major",
      "A public-facing badge, endorsement, role, or visibility signal was reduced after an unfavorable review.",
      { events: badgeWithdrawals.map((event) => ({ actor: event.actor, action: event.action, daysAfterReview: event.daysAfterReview })) },
      "Hold public profile updates until the action is justified by evidence unrelated to the review outcome."
    ));
  }

  if (criticalReview && suspiciousEvents.length > 0 && packet.safeguards.independentModeratorReview !== true) {
    findings.push(finding(
      "INDEPENDENT_REVIEW_MISSING_FOR_RETALIATION_RISK",
      "major",
      "The packet has retaliation risk but no independent moderator review recorded.",
      { independentModeratorReview: packet.safeguards.independentModeratorReview || false },
      "Add independent moderator signoff before applying the reputation change."
    ));
  }

  const appealWindowDays = Number(packet.safeguards.appealWindowDays || 0);
  if (suspiciousEvents.length > 0 && appealWindowDays < 14) {
    findings.push(finding(
      "APPEAL_WINDOW_TOO_SHORT_FOR_REPUTATION_DELTA",
      "major",
      "The reviewer has insufficient time to appeal a reputation-impacting action.",
      { appealWindowDays },
      "Provide at least a 14-day appeal window and show the evidence packet to the affected reviewer."
    ));
  }

  if (
    findings.length > 0 &&
    packet.exportTarget.publicProfileExport === true &&
    packet.safeguards.freezePublicExport !== true
  ) {
    findings.push(finding(
      "PUBLIC_REPUTATION_EXPORT_NOT_FROZEN",
      "critical",
      "Public reputation export is enabled while unresolved retaliation risk exists.",
      { publicProfileExport: packet.exportTarget.publicProfileExport, freezePublicExport: packet.safeguards.freezePublicExport || false },
      "Freeze the public export and leaderboard deltas until the retaliation review is resolved."
    ));
  }

  const riskScore = scoreFindings(findings);
  const decision = decisionFor(findings);

  return {
    id: packet.id,
    title: packet.title,
    reviewerId,
    criticalReview,
    retaliationWindowDays,
    decision,
    riskScore,
    findings,
    suspiciousEventCount: suspiciousEvents.length,
    relevantEventCount: relevantEvents.length,
    recommendedActions: buildRecommendedActions(decision, findings)
  };
}

function buildRecommendedActions(decision, findings) {
  if (decision === "CLEAR") {
    return ["Apply reputation changes with normal audit logging."];
  }

  const actions = [
    "Freeze reputation deltas tied to the flagged review.",
    "Generate an evidence packet for an independent moderator.",
    "Notify the affected reviewer of the appeal pathway."
  ];

  if (findings.some((item) => item.code === "PUBLIC_REPUTATION_EXPORT_NOT_FROZEN")) {
    actions.unshift("Disable leaderboard and public profile export for the affected reviewer until resolution.");
  }

  return actions;
}

function analyzeReputationPackets(packets) {
  const results = list(packets).map(analyzePacket);
  const counts = results.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, { CLEAR: 0, REVIEW: 0, HOLD: 0 });

  return {
    generatedAt: new Date().toISOString(),
    totalPackets: results.length,
    counts,
    results
  };
}

module.exports = {
  analyzePacket,
  analyzeReputationPackets,
  isCriticalReview,
  daysBetween
};
