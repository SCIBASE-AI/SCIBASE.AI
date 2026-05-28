"use strict";

const SEVERITY_WEIGHT = {
  critical: 26,
  high: 18,
  medium: 10,
  low: 4
};

function reviewCompletionReputation(packet) {
  const findings = [];
  const challenge = packet.challenge || {};
  const settlement = packet.settlement || {};
  const sponsor = packet.sponsorEvidence || {};
  const attribution = packet.teamAttribution || {};
  const update = packet.reputationUpdate || {};
  const risk = packet.riskSignals || {};

  const declaredMilestones = new Set(challenge.declaredMilestones || []);
  const acceptedMilestones = new Set(challenge.acceptedMilestones || []);
  const missingMilestones = [...declaredMilestones].filter((milestone) => !acceptedMilestones.has(milestone));

  if (settlement.status !== "funded-settled" || !settlement.fundingEvidence || !settlement.escrowReleaseId) {
    addFinding(
      findings,
      "critical",
      "unfunded-settlement",
      "Sponsor acceptance is not enough for reputation credit",
      `Settlement status is "${settlement.status}" and funded release evidence is missing.`,
      "Hold badges, leaderboard points, and citation visibility until funded settlement evidence is attached."
    );
  }

  if (settlement.appealOpen || settlement.holdUntil) {
    addFinding(
      findings,
      "high",
      "appeal-window-open",
      "Appeal or hold window is still active",
      `appealOpen=${Boolean(settlement.appealOpen)}, holdUntil=${settlement.holdUntil || "not set"}.`,
      "Queue the reputation update as pending until appeal and hold windows close without unresolved disputes."
    );
  }

  if (missingMilestones.length > 0 || sponsor.acceptanceScope !== "full") {
    addFinding(
      findings,
      "high",
      "milestone-scope-gap",
      "Accepted scope does not cover all declared milestones",
      `Missing accepted milestone(s): ${missingMilestones.join(", ") || "none"}; acceptanceScope=${sponsor.acceptanceScope || "unknown"}.`,
      "Award only milestone-scoped credit or request explicit sponsor acceptance for the remaining deliverables."
    );
  }

  const contributors = Array.isArray(attribution.contributors) ? attribution.contributors : [];
  const attributionMismatch = contributors.filter(
    (person) => Math.abs(Number(person.declaredSharePercent || 0) - Number(person.evidenceSharePercent || 0)) >= 20
  );
  if (!attribution.splitAgreementSigned || attributionMismatch.length > 0) {
    addFinding(
      findings,
      "high",
      "team-attribution-mismatch",
      "Team credit split is not supported by evidence",
      `${attributionMismatch.length} contributor split(s) differ by at least 20 percentage points; splitAgreementSigned=${Boolean(attribution.splitAgreementSigned)}.`,
      "Require signed split agreement or allocate provisional credit using evidence-backed contribution shares."
    );
  }

  if (Array.isArray(update.duplicateClaimIds) && update.duplicateClaimIds.length > 0) {
    addFinding(
      findings,
      "medium",
      "duplicate-claim-risk",
      "Requested reputation update overlaps prior claims",
      `Duplicate or overlapping claim ids: ${update.duplicateClaimIds.join(", ")}.`,
      "Deduplicate badge and point events before reputation ledgers or citation pages are updated."
    );
  }

  if (risk.scopeChangedAfterSubmission) {
    addFinding(
      findings,
      "medium",
      "post-submission-scope-change",
      "Scope changed after solver submission",
      "The packet marks scopeChangedAfterSubmission=true.",
      "Normalize reputation credit to the scope active at submission time or attach sponsor-approved change evidence."
    );
  }

  if (risk.externalReviewPending) {
    addFinding(
      findings,
      "medium",
      "external-review-pending",
      "Independent review is not complete",
      "External review is still pending while reputation points and badges are requested.",
      "Hold expert-tier badges until the external reviewer decision is final."
    );
  }

  if (risk.solverDisputeCount > 0 || sponsor.reviewerScoresFrozen !== true) {
    addFinding(
      findings,
      "medium",
      "dispute-or-unfrozen-scores",
      "Disputes or mutable scorecards can distort reputation",
      `solverDisputeCount=${risk.solverDisputeCount || 0}, reviewerScoresFrozen=${Boolean(sponsor.reviewerScoresFrozen)}.`,
      "Block leaderboard promotion until disputes close and the scorecard hash is frozen."
    );
  }

  if (update.leaderboardTier === "gold" && challenge.difficulty !== "expert") {
    addFinding(
      findings,
      "low",
      "difficulty-tier-mismatch",
      "Requested leaderboard tier is stronger than challenge difficulty",
      `difficulty=${challenge.difficulty || "unknown"}, leaderboardTier=${update.leaderboardTier}.`,
      "Apply difficulty-normalized points and reserve top-tier badges for expert-level challenges."
    );
  }

  const riskScore = Math.min(
    100,
    findings.reduce((total, finding) => total + SEVERITY_WEIGHT[finding.severity], 0)
  );
  const releaseReadiness = Math.max(0, 100 - riskScore);
  const severityCounts = countBySeverity(findings);
  const status =
    severityCounts.critical > 0 || severityCounts.high >= 2
      ? "block-reputation-release"
      : "hold-for-manual-review";

  return {
    packetId: packet.packetId,
    challengeTitle: challenge.title,
    reviewedAt: "2026-05-28T00:00:00.000Z",
    status,
    riskScore,
    releaseReadiness,
    findingCount: findings.length,
    severityCounts,
    findings,
    recommendedLedgerAction:
      "Keep reputation deltas pending until funded settlement, appeal closure, milestone parity, and evidence-backed team attribution are present."
  };
}

function addFinding(findings, severity, id, title, evidence, remediation) {
  findings.push({ severity, id, title, evidence, remediation });
}

function countBySeverity(findings) {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.severity] += 1;
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

function toMarkdown(report) {
  const rows = report.findings
    .map((finding) => `| ${finding.severity} | ${finding.id} | ${finding.title} | ${finding.remediation} |`)
    .join("\n");

  return [
    `# Scientific Bounty Reputation Review: ${report.packetId}`,
    "",
    `Status: **${report.status}**`,
    `Risk score: **${report.riskScore}/100**`,
    `Release readiness: **${report.releaseReadiness}/100**`,
    "",
    report.recommendedLedgerAction,
    "",
    "| Severity | Check | Finding | Action |",
    "| --- | --- | --- | --- |",
    rows
  ].join("\n");
}

function toSvg(report) {
  const width = 960;
  const height = 540;
  const barWidth = Math.round((report.riskScore / 100) * 680);
  const colors = {
    critical: "#991b1b",
    high: "#b45309",
    medium: "#1d4ed8",
    low: "#15803d"
  };
  const rows = Object.entries(report.severityCounts)
    .map(([severity, count], index) => {
      const y = 310 + index * 36;
      const countWidth = Math.max(8, count * 50);
      return `<text x="120" y="${y}" font-family="Arial" font-size="20" fill="#111827">${severity}</text><rect x="270" y="${y - 20}" width="${countWidth}" height="22" rx="4" fill="${colors[severity]}"/><text x="${285 + countWidth}" y="${y}" font-family="Arial" font-size="18" fill="#111827">${count}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <text x="80" y="86" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Bounty completion reputation guard</text>
  <text x="80" y="125" font-family="Arial" font-size="18" fill="#475569">${escapeXml(report.packetId)} - ${escapeXml(report.status)}</text>
  <rect x="80" y="174" width="680" height="42" rx="8" fill="#e5e7eb"/>
  <rect x="80" y="174" width="${barWidth}" height="42" rx="8" fill="#dc2626"/>
  <text x="785" y="203" font-family="Arial" font-size="30" font-weight="700" fill="#111827">${report.riskScore}/100</text>
  <text x="80" y="258" font-family="Arial" font-size="22" font-weight="700" fill="#111827">Finding severity mix</text>
  ${rows}
</svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  reviewCompletionReputation,
  toMarkdown,
  toSvg
};
