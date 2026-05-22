const crypto = require("crypto");

const SEVERITY_ORDER = {
  blocker: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4
};

function buildEditHistoryReport(batch, options = {}) {
  validateBatch(batch);

  const checkedAt = options.checkedAt || "2026-05-22T00:00:00.000Z";
  const policy = Object.assign({
    editWindowHours: 24,
    maxScoreDeltaWithoutSteward: 1,
    freezeAfterAuthorResponse: true,
    requireReasonForReputationImpact: true
  }, batch.policy || {});

  const reviewDecisions = batch.reviews.map((review) => evaluateReview(review, policy));
  const actions = buildActions(reviewDecisions);
  const summary = summarize(reviewDecisions);
  const releaseGate = buildReleaseGate(summary, actions);
  const profileDeltas = buildProfileDeltas(reviewDecisions);

  const report = {
    batch: {
      id: batch.id,
      projectId: batch.projectId
    },
    checkedAt,
    policy,
    releaseGate,
    summary,
    reviewDecisions,
    profileDeltas,
    actions,
    reproducibilityContext: {
      dataPolicy: "synthetic fixture only",
      reviewVersionFingerprint: digest(batch.reviews),
      deterministic: true,
      externalNetworkCalls: 0
    }
  };
  report.auditDigest = digest(report);
  return report;
}

function validateBatch(batch) {
  if (!batch || typeof batch !== "object") {
    throw new TypeError("batch must be an object");
  }
  if (!Array.isArray(batch.reviews) || batch.reviews.length === 0) {
    throw new Error("reviews must be a non-empty array");
  }
  for (const review of batch.reviews) {
    if (!review.id || !review.reviewerId || !Array.isArray(review.versions) || review.versions.length === 0) {
      throw new Error("each review requires id, reviewerId, and versions");
    }
  }
}

function evaluateReview(review, policy) {
  const sorted = review.versions.slice().sort((left, right) => left.version - right.version);
  const original = sorted[0];
  const latest = sorted[sorted.length - 1];
  const findings = [];

  for (const version of sorted) {
    if (version.editorId !== review.reviewerId) {
      findings.push({
        type: "non_reviewer_edit",
        severity: "blocker",
        version: version.version,
        message: `Version ${version.version} was edited by ${version.editorId}, not the original reviewer.`
      });
    }
    if (containsIdentityLeak(version.comment, review.visibility)) {
      findings.push({
        type: "identity_leak_in_edit",
        severity: "high",
        version: version.version,
        message: `Version ${version.version} may reveal reviewer identity in ${review.visibility} mode.`
      });
    }
    if (version.version > 1 && policy.requireReasonForReputationImpact && !String(version.reason || "").trim()) {
      findings.push({
        type: "missing_edit_reason",
        severity: "medium",
        version: version.version,
        message: `Version ${version.version} has no edit reason for an auditable reputation timeline.`
      });
    }
  }

  const hoursAfterSubmission = hoursBetween(review.submittedAt, latest.editedAt);
  if (hoursAfterSubmission > policy.editWindowHours) {
    findings.push({
      type: "edit_window_expired",
      severity: "high",
      version: latest.version,
      message: `Latest edit landed ${hoursAfterSubmission.toFixed(1)} hours after submission.`
    });
  }

  if (policy.freezeAfterAuthorResponse && review.authorRespondedAt && new Date(latest.editedAt) > new Date(review.authorRespondedAt)) {
    findings.push({
      type: "post_author_response_edit",
      severity: "high",
      version: latest.version,
      message: "Latest edit occurred after an author response, so reputation deltas should not silently mutate."
    });
  }

  const scoreDelta = Math.abs(score(latest) - score(original));
  if (scoreDelta > policy.maxScoreDeltaWithoutSteward) {
    findings.push({
      type: "large_score_delta",
      severity: "high",
      version: latest.version,
      message: `Score changed by ${scoreDelta.toFixed(2)}, above the steward-review threshold.`
    });
  }

  if (findings.length === 0) {
    findings.push({
      type: "edit_history_valid",
      severity: "info",
      version: latest.version,
      message: "Review edit history is safe for automatic reputation update."
    });
  }

  const severity = worstSeverity(findings);
  const reputationDecision = decideReputationAction(severity, findings, original, latest);
  return {
    reviewId: review.id,
    reviewerRef: anonymizeReviewer(review.reviewerId, review.visibility),
    visibility: review.visibility,
    versionCount: sorted.length,
    originalScore: score(original),
    latestScore: score(latest),
    scoreDelta: Number((score(latest) - score(original)).toFixed(2)),
    latestVersion: latest.version,
    severity,
    reputationDecision,
    immutableVersionDigest: digest(sorted),
    findings
  };
}

function decideReputationAction(severity, findings, original, latest) {
  if (severity === "blocker") {
    return {
      status: "freeze",
      scoreForReputation: score(original),
      timelineVersion: original.version,
      reason: "Freeze reputation on the last trusted reviewer-authored version."
    };
  }
  if (severity === "high") {
    return {
      status: "steward_review",
      scoreForReputation: score(original),
      timelineVersion: original.version,
      reason: `Steward review required: ${findings.filter((finding) => finding.severity === "high").map((finding) => finding.type).join(", ")}.`
    };
  }
  if (severity === "medium") {
    return {
      status: "revise_receipt",
      scoreForReputation: score(latest),
      timelineVersion: latest.version,
      reason: "Update reviewer receipt before profile or leaderboard deltas are recomputed."
    };
  }
  return {
    status: "apply_latest",
    scoreForReputation: score(latest),
    timelineVersion: latest.version,
    reason: "Latest version is safe for reputation and timeline updates."
  };
}

function buildActions(reviewDecisions) {
  return reviewDecisions
    .filter((decision) => decision.severity !== "info")
    .map((decision) => ({
      priority: decision.severity,
      reviewId: decision.reviewId,
      title: `${decision.reputationDecision.status.toUpperCase()} ${decision.reviewId}`,
      action: buildActionText(decision)
    }))
    .sort((left, right) => {
      const severityDelta = SEVERITY_ORDER[left.priority] - SEVERITY_ORDER[right.priority];
      if (severityDelta !== 0) return severityDelta;
      return left.reviewId.localeCompare(right.reviewId);
    });
}

function buildActionText(decision) {
  const findingText = decision.findings
    .filter((finding) => finding.severity !== "info")
    .map((finding) => finding.message)
    .join(" ");
  return `${decision.reputationDecision.reason} ${findingText}`.trim();
}

function summarize(reviewDecisions) {
  const bySeverity = { blocker: 0, high: 0, medium: 0, low: 0, info: 0 };
  const byStatus = {};
  for (const decision of reviewDecisions) {
    bySeverity[decision.severity] += 1;
    byStatus[decision.reputationDecision.status] = (byStatus[decision.reputationDecision.status] || 0) + 1;
  }
  const scoreValue = Math.max(0, 100 - bySeverity.blocker * 30 - bySeverity.high * 20 - bySeverity.medium * 10);
  return {
    score: scoreValue,
    reviewsChecked: reviewDecisions.length,
    blockers: bySeverity.blocker,
    high: bySeverity.high,
    medium: bySeverity.medium,
    frozenReviews: byStatus.freeze || 0,
    stewardReviews: byStatus.steward_review || 0,
    receiptRevisions: byStatus.revise_receipt || 0,
    appliedLatest: byStatus.apply_latest || 0
  };
}

function buildReleaseGate(summary, actions) {
  if (summary.blockers > 0) {
    return {
      status: "hold",
      reason: "One or more review histories have non-reviewer edits or immutable-version violations.",
      nextAction: actions[0] ? actions[0].action : "Freeze affected reputation deltas."
    };
  }
  if (summary.high > 0 || summary.medium > 0) {
    return {
      status: "steward_review",
      reason: "Review edits require steward review or receipt revision before reputation updates.",
      nextAction: actions[0] ? actions[0].action : "Review edit history packets."
    };
  }
  return {
    status: "pass",
    reason: "Review edit histories are safe for profile, badge, leaderboard, and timeline updates.",
    nextAction: "Apply latest trusted review versions."
  };
}

function buildProfileDeltas(reviewDecisions) {
  return reviewDecisions.map((decision) => ({
    reviewId: decision.reviewId,
    reviewerRef: decision.reviewerRef,
    status: decision.reputationDecision.status,
    timelineVersion: decision.reputationDecision.timelineVersion,
    scoreForReputation: decision.reputationDecision.scoreForReputation,
    delta: Number((decision.reputationDecision.scoreForReputation - 3).toFixed(2)),
    digest: decision.immutableVersionDigest.slice(0, 16)
  }));
}

function score(version) {
  return Number(((version.clarity + version.rigor + version.novelty + version.reproducibility) / 4).toFixed(2));
}

function hoursBetween(start, end) {
  return (new Date(end).getTime() - new Date(start).getTime()) / (60 * 60 * 1000);
}

function containsIdentityLeak(comment, visibility) {
  if (visibility === "public") return false;
  return /@|email|contact me|orcid|github\.com|\.edu|\.com/i.test(String(comment || ""));
}

function anonymizeReviewer(reviewerId, visibility) {
  if (visibility === "public") return reviewerId;
  return `anon_${digest(reviewerId).slice(0, 10)}`;
}

function worstSeverity(findings) {
  return findings.slice().sort((left, right) =>
    SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
  )[0].severity;
}

function toMarkdown(report) {
  const lines = [
    "# Peer Review Edit History Guard Report",
    "",
    `Project: ${report.batch.projectId}`,
    `Decision: ${report.releaseGate.status.toUpperCase()}`,
    `Score: ${report.summary.score}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Reviews checked: ${report.summary.reviewsChecked}`,
    `- Frozen reviews: ${report.summary.frozenReviews}`,
    `- Steward reviews: ${report.summary.stewardReviews}`,
    `- Receipt revisions: ${report.summary.receiptRevisions}`,
    "",
    "## Actions",
    ""
  ];

  for (const action of report.actions) {
    lines.push(`- [${action.priority}] ${action.title}: ${action.action}`);
  }

  lines.push("", "## Profile Deltas", "");
  for (const delta of report.profileDeltas) {
    lines.push(`- ${delta.reviewId}: ${delta.status}, v${delta.timelineVersion}, score ${delta.scoreForReputation}, delta ${delta.delta}`);
  }

  lines.push("", "## Reproducibility Context", "");
  lines.push(`- Data policy: ${report.reproducibilityContext.dataPolicy}`);
  lines.push(`- External network calls: ${report.reproducibilityContext.externalNetworkCalls}`);
  lines.push(`- Version fingerprint: ${report.reproducibilityContext.reviewVersionFingerprint}`);

  return `${lines.join("\n")}\n`;
}

function toSvg(report) {
  const bars = [
    { label: "Frozen", value: report.summary.frozenReviews, color: "#b91c1c" },
    { label: "Steward", value: report.summary.stewardReviews, color: "#b45309" },
    { label: "Revisions", value: report.summary.receiptRevisions, color: "#1d4ed8" },
    { label: "Score", value: report.summary.score, color: "#047857" }
  ];
  const maxValue = Math.max(1, ...bars.map((bar) => bar.value));
  const barMarkup = bars.map((bar, index) => {
    const y = 230 + index * 70;
    const width = Math.round((bar.value / maxValue) * 540);
    return [
      `<text x="80" y="${y}" font-family="Arial, sans-serif" font-size="26" fill="#172554">${escapeXml(bar.label)}</text>`,
      `<rect x="260" y="${y - 28}" width="560" height="36" rx="4" fill="#e5e7eb"/>`,
      `<rect x="260" y="${y - 28}" width="${width}" height="36" rx="4" fill="${bar.color}"/>`,
      `<text x="845" y="${y}" font-family="Arial, sans-serif" font-size="26" fill="#111827">${bar.value}</text>`
    ].join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="620" viewBox="0 0 1100 620" role="img" aria-label="Peer review edit history guard summary">`,
    `<rect width="1100" height="620" fill="#f8fafc"/>`,
    `<rect x="48" y="44" width="1004" height="532" rx="8" fill="#ffffff" stroke="#cbd5e1"/>`,
    `<text x="80" y="112" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#0f172a">Peer Review Edit History Guard</text>`,
    `<text x="80" y="160" font-family="Arial, sans-serif" font-size="24" fill="#334155">Gate: ${escapeXml(report.releaseGate.status.toUpperCase())} | Score: ${report.summary.score} | Digest: ${escapeXml(report.auditDigest.slice(0, 16))}</text>`,
    barMarkup,
    `<text x="80" y="548" font-family="Arial, sans-serif" font-size="22" fill="#475569">Synthetic review history only. No user data, credentials, or network calls.</text>`,
    `</svg>`
  ].join("\n");
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  buildEditHistoryReport,
  toMarkdown,
  toSvg,
  score,
  containsIdentityLeak,
  anonymizeReviewer,
  digest
};
