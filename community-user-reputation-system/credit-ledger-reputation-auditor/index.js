"use strict";

const crypto = require("crypto");

const CREDIT_ROLES = new Set([
  "conceptualization",
  "data curation",
  "formal analysis",
  "funding acquisition",
  "investigation",
  "methodology",
  "project administration",
  "resources",
  "software",
  "supervision",
  "validation",
  "visualization",
  "writing original draft",
  "writing review editing",
]);

const WEIGHTS = {
  critical: 25,
  high: 18,
  medium: 10,
  low: 5,
};

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase().replace(/[&/]+/g, " ");
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || "medium",
    recommendation: recommendationFor(finding.code),
    ...finding,
  });
}

function recommendationFor(code) {
  const recommendations = {
    INVALID_CREDIT_ROLE: "Map the contribution to a valid CRediT role before publishing the profile.",
    DUPLICATE_CREDIT_EVENT: "Merge duplicate credit events or mark the later entry as a correction.",
    LATE_CREDIT_BACKFILL: "Require author approval and a visible audit note for late credit backfills.",
    DISPUTED_CREDIT_INCLUDED: "Exclude disputed credit from reputation totals until arbitration closes.",
    UNSIGNED_CONTRIBUTION: "Require contributor attestation for reputation-affecting credit.",
    REPUTATION_COMPONENT_MISMATCH: "Recompute score components from the ledger and store the formula version.",
    BADGE_ELIGIBILITY_DRIFT: "Revoke or hold badges whose eligibility inputs no longer pass thresholds.",
    REVIEW_QUALITY_OUTLIER: "Route low-quality high-volume reviews for moderation before awarding reputation.",
    MISSING_PROJECT_TIMELINE_LINK: "Attach each credit event to a project timeline or citation page entry.",
  };
  return recommendations[code] || "Route this record for reputation-system review.";
}

function auditCreditLedger(profile) {
  const findings = [];
  const seenCredits = new Map();
  const creditTotals = {};
  let signedCredits = 0;
  let undisputedCredits = 0;

  for (const credit of profile.creditEvents || []) {
    const role = normalizeRole(credit.role);
    creditTotals[role] = (creditTotals[role] || 0) + (credit.weight || 1);

    if (!CREDIT_ROLES.has(role)) {
      addFinding(findings, {
        code: "INVALID_CREDIT_ROLE",
        severity: "high",
        creditId: credit.id,
        message: `Credit ${credit.id} uses non-CRediT role "${credit.role}".`,
        evidence: credit,
      });
    }

    const duplicateKey = `${credit.projectId}:${credit.artifactId}:${credit.contributorId}:${role}:${credit.commitSha || ""}`;
    if (seenCredits.has(duplicateKey)) {
      addFinding(findings, {
        code: "DUPLICATE_CREDIT_EVENT",
        severity: "medium",
        creditId: credit.id,
        message: `Credit ${credit.id} duplicates ${seenCredits.get(duplicateKey)}.`,
        evidence: { duplicateOf: seenCredits.get(duplicateKey), credit },
      });
    } else {
      seenCredits.set(duplicateKey, credit.id);
    }

    if (daysBetween(credit.contributionAt, credit.loggedAt) > (profile.policy?.maxBackfillDays || 14)) {
      addFinding(findings, {
        code: "LATE_CREDIT_BACKFILL",
        severity: credit.authorApproval ? "medium" : "high",
        creditId: credit.id,
        message: `Credit ${credit.id} was backfilled ${daysBetween(credit.contributionAt, credit.loggedAt)} days after contribution.`,
        evidence: credit,
      });
    }

    if (credit.disputeStatus && !["none", "resolved"].includes(credit.disputeStatus)) {
      addFinding(findings, {
        code: "DISPUTED_CREDIT_INCLUDED",
        severity: "critical",
        creditId: credit.id,
        message: `Credit ${credit.id} is ${credit.disputeStatus} but still present in reputation input.`,
        evidence: credit,
      });
    } else {
      undisputedCredits += credit.weight || 1;
    }

    if (!credit.contributorAttestedAt) {
      addFinding(findings, {
        code: "UNSIGNED_CONTRIBUTION",
        severity: "medium",
        creditId: credit.id,
        message: `Credit ${credit.id} has no contributor attestation timestamp.`,
        evidence: credit,
      });
    } else {
      signedCredits += credit.weight || 1;
    }

    if (!credit.timelineUrl && !credit.citationUrl) {
      addFinding(findings, {
        code: "MISSING_PROJECT_TIMELINE_LINK",
        severity: "low",
        creditId: credit.id,
        message: `Credit ${credit.id} is not linked to a project timeline or citation page.`,
        evidence: credit,
      });
    }
  }

  const computed = computeReputation(profile, { signedCredits, undisputedCredits });
  for (const [component, value] of Object.entries(computed.components)) {
    const stored = profile.reputation?.components?.[component];
    if (typeof stored === "number" && Math.abs(stored - value) > 0.01) {
      addFinding(findings, {
        code: "REPUTATION_COMPONENT_MISMATCH",
        severity: "high",
        component,
        message: `Stored ${component}=${stored} differs from computed ${value}.`,
        evidence: { stored, computed: value },
      });
    }
  }

  for (const badge of profile.badges || []) {
    const eligible = evaluateBadge(badge, computed, profile);
    if (!eligible) {
      addFinding(findings, {
        code: "BADGE_ELIGIBILITY_DRIFT",
        severity: "medium",
        badgeId: badge.id,
        message: `Badge ${badge.name} no longer satisfies eligibility rules.`,
        evidence: { badge, computed },
      });
    }
  }

  for (const review of profile.peerReviews || []) {
    if (review.qualityScore < 0.45 && review.helpfulnessVotes < 2 && review.reputationAwarded > 0) {
      addFinding(findings, {
        code: "REVIEW_QUALITY_OUTLIER",
        severity: "high",
        reviewId: review.id,
        message: `Review ${review.id} earned reputation despite weak quality/helpfulness signals.`,
        evidence: review,
      });
    }
  }

  const riskScore = Math.min(100, findings.reduce((score, finding) => score + WEIGHTS[finding.severity], 0));
  const decision = riskScore >= 70 ? "hold-reputation-publication" : riskScore >= 35 ? "repair-credit-ledger" : "publish-profile";
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify(findings.map((finding) => [finding.code, finding.creditId, finding.component, finding.badgeId]).sort()))
    .digest("hex")
    .slice(0, 16);

  return {
    profile: {
      userId: profile.userId,
      displayName: profile.displayName,
      institution: profile.institution,
    },
    summary: {
      decision,
      riskScore,
      auditDigest,
      creditEventsReviewed: (profile.creditEvents || []).length,
      peerReviewsReviewed: (profile.peerReviews || []).length,
      badgesReviewed: (profile.badges || []).length,
      findings: findings.length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
      computedScore: computed.total,
      storedScore: profile.reputation?.total,
    },
    computedReputation: computed,
    creditTotals,
    findings,
    publicationGates: [
      { gate: "All credit roles map to CRediT taxonomy.", passed: !findings.some((finding) => finding.code === "INVALID_CREDIT_ROLE") },
      { gate: "Disputed credits are excluded from score inputs.", passed: !findings.some((finding) => finding.code === "DISPUTED_CREDIT_INCLUDED") },
      { gate: "Stored reputation components match the transparent formula.", passed: !findings.some((finding) => finding.code === "REPUTATION_COMPONENT_MISMATCH") },
      { gate: "Badges match current score and verification inputs.", passed: !findings.some((finding) => finding.code === "BADGE_ELIGIBILITY_DRIFT") },
      { gate: "Peer review reputation is backed by quality/helpfulness signals.", passed: !findings.some((finding) => finding.code === "REVIEW_QUALITY_OUTLIER") },
    ],
  };
}

function computeReputation(profile, { signedCredits, undisputedCredits }) {
  const reviews = profile.peerReviews || [];
  const reviewQuality = reviews.reduce((sum, review) => sum + review.qualityScore * Math.max(1, review.helpfulnessVotes), 0);
  const verifiedBadges = (profile.badges || []).filter((badge) => badge.verified).length;
  const components = {
    contributionCredit: Number(Math.min(40, undisputedCredits * 4).toFixed(2)),
    attestationCoverage: Number(Math.min(15, signedCredits * 2).toFixed(2)),
    peerReviewQuality: Number(Math.min(25, reviewQuality * 3).toFixed(2)),
    reproducibility: profile.reproducibilityVerified ? 12 : 0,
    bountyCompletion: Number(Math.min(8, (profile.completedBounties || 0) * 2).toFixed(2)),
    verifiedBadges: Number(Math.min(10, verifiedBadges * 2).toFixed(2)),
  };
  return {
    formulaVersion: "credit-ledger-v1",
    components,
    total: Number(Object.values(components).reduce((sum, value) => sum + value, 0).toFixed(2)),
  };
}

function evaluateBadge(badge, computed, profile) {
  if (badge.id === "trusted-reviewer") {
    return computed.components.peerReviewQuality >= 18 && profile.peerReviews.length >= 3;
  }
  if (badge.id === "open-science-champion") {
    return profile.reproducibilityVerified && computed.components.contributionCredit >= 24;
  }
  if (badge.id === "credit-steward") {
    return computed.components.attestationCoverage >= 10;
  }
  return Boolean(badge.verified);
}

function daysBetween(leftIso, rightIso) {
  return Math.round((new Date(rightIso).getTime() - new Date(leftIso).getTime()) / 86400000);
}

function renderMarkdownReport(report) {
  const lines = [
    `# Credit Ledger Reputation Audit: ${report.profile.displayName}`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Risk score: ${report.summary.riskScore}`,
    `- Stored score: ${report.summary.storedScore}`,
    `- Computed score: ${report.summary.computedScore}`,
    `- Credit events reviewed: ${report.summary.creditEventsReviewed}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.code}${finding.creditId ? ` (${finding.creditId})` : ""}`);
    lines.push(`  - ${finding.message}`);
    lines.push(`  - Recommendation: ${finding.recommendation}`);
  }

  lines.push("", "## Reputation Components", "");
  for (const [name, value] of Object.entries(report.computedReputation.components)) {
    lines.push(`- ${name}: ${value}`);
  }

  lines.push("", "## Publication Gates", "");
  for (const gate of report.publicationGates) {
    lines.push(`- [${gate.passed ? "x" : "!"}] ${gate.gate}`);
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  auditCreditLedger,
  renderMarkdownReport,
  computeReputation,
  daysBetween,
  normalizeRole,
};
