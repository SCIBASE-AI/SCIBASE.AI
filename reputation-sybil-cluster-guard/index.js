const SEVERITY = { block: 3, warn: 2 };

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function groupsBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    groups.set(value, [...(groups.get(value) || []), item]);
  }
  return groups;
}

export function auditReputationSybilCluster(packet) {
  if (!packet || typeof packet !== "object") {
    throw new TypeError("reputation packet must be an object");
  }

  const users = packet.users || [];
  const endorsements = packet.endorsements || [];
  const reviews = packet.reviews || [];
  const controls = packet.controls || {};
  const findings = [];

  for (const [payoutHandle, members] of groupsBy(users, "payoutHandle")) {
    if (members.length > 1) {
      findings.push(
        finding(
          "SHARED_PAYOUT_HANDLE",
          "block",
          "Multiple reputation accounts share the same payout handle.",
          { payoutHandle, userIds: members.map((member) => member.userId) },
          "Pause payout eligibility and require identity review before reputation points affect bounty access.",
        ),
      );
    }
  }

  for (const [fingerprint, members] of groupsBy(users, "deviceFingerprint")) {
    if (members.length >= 3) {
      findings.push(
        finding(
          "RECYCLED_DEVICE_FINGERPRINT",
          "block",
          "Three or more accounts share a device fingerprint inside the same review window.",
          { fingerprint, userIds: members.map((member) => member.userId) },
          "Quarantine the cluster and suppress leaderboard movement until reviewed.",
        ),
      );
    }
  }

  const burstEndorsements = endorsements.filter((endorsement) => endorsement.createdMinutesAfterSignup <= 30);
  if (burstEndorsements.length >= 3) {
    findings.push(
      finding(
        "BURST_ENDORSEMENT_RING",
        "warn",
        "Several endorsements were created immediately after signup.",
        { count: burstEndorsements.length, edges: burstEndorsements.map(({ from, to }) => `${from}->${to}`) },
        "Delay endorsement credit until accounts age past the configured trust window.",
      ),
    );
  }

  const invitationCounts = groupsBy(users, "invitedBy");
  for (const [inviter, members] of invitationCounts) {
    if (inviter !== "seed" && members.length >= 2) {
      findings.push(
        finding(
          "SUSPICIOUS_INVITATION_CHAIN",
          "warn",
          "A non-seed account invited multiple high-velocity reputation accounts.",
          { inviter, invitees: members.map((member) => member.userId) },
          "Require manual review before granting invitation-derived reputation boosts.",
        ),
      );
    }
  }

  const reciprocalReviewEdges = new Set(reviews.map((review) => `${review.reviewer}:${review.submitter}`));
  const ringEdges = reviews.filter((review) => reciprocalReviewEdges.has(`${review.submitter}:${review.reviewer}`) || review.score >= 5);
  if (ringEdges.length >= 3) {
    findings.push(
      finding(
        "SELF_REVIEW_RING_RISK",
        "block",
        "Reviewer and submitter relationships form a high-score ring across bounty projects.",
        { edges: ringEdges.map(({ reviewer, submitter, projectId }) => `${reviewer}->${submitter}@${projectId}`) },
        "Suppress review-derived reputation and route the cluster to trust-and-safety review.",
      ),
    );
  }

  const totalReputationDelta = users.reduce((total, user) => total + Number(user.reputationDelta || 0), 0);
  if (totalReputationDelta >= 100 && findings.length > 0) {
    findings.push(
      finding(
        "HIGH_REPUTATION_DELTA_UNDER_RISK",
        "warn",
        "The cluster gained enough reputation to affect rankings or bounty eligibility while risk signals are present.",
        { totalReputationDelta },
        "Hold reputation deltas until the cluster review is resolved.",
      ),
    );
  }

  if (findings.some((item) => item.severity === "block") && (!controls.quarantineApplied || !controls.leaderboardSuppressed || !controls.payoutEligibilityPaused)) {
    findings.push(
      finding(
        "MISSING_CLUSTER_QUARANTINE",
        "block",
        "Blocking sybil signals exist but reputation, ranking, or payout controls are not fully paused.",
        controls,
        "Apply quarantine, suppress leaderboard rank, pause payout eligibility, and open a manual review ticket.",
      ),
    );
  }

  const blockCount = findings.filter((item) => item.severity === "block").length;
  const warnCount = findings.filter((item) => item.severity === "warn").length;
  return {
    clusterId: packet.clusterId,
    reviewWindow: packet.reviewWindow,
    decision: blockCount > 0 ? "quarantine-cluster" : warnCount > 0 ? "manual-review" : "reputation-clear",
    riskScore: Math.min(100, blockCount * 25 + warnCount * 10),
    summary: {
      blockCount,
      warnCount,
      findingCount: findings.length,
      userCount: users.length,
      endorsementCount: endorsements.length,
      reviewCount: reviews.length,
    },
    findings: findings.sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity] || a.code.localeCompare(b.code)),
  };
}

export function buildReviewerMarkdown(report) {
  const lines = [
    `# Reputation Sybil Cluster Guard: ${report.clusterId}`,
    "",
    `Review window: **${report.reviewWindow}**`,
    `Decision: **${report.decision}**`,
    `Risk score: **${report.riskScore}/100**`,
    "",
    `Findings: ${report.summary.blockCount} blockers, ${report.summary.warnCount} warnings.`,
    "",
  ];

  for (const item of report.findings) {
    lines.push(`## ${item.severity.toUpperCase()}: ${item.code}`);
    lines.push(item.message);
    lines.push("");
    lines.push(`Evidence: \`${JSON.stringify(item.evidence)}\``);
    lines.push("");
    lines.push(`Remediation: ${item.remediation}`);
    lines.push("");
  }

  if (report.findings.length === 0) lines.push("No sybil-cluster reputation issues were detected.\n");
  return lines.join("\n");
}

export function buildSummarySvg(report) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="544" viewBox="0 0 960 544" role="img" aria-label="Reputation sybil cluster guard summary">
  <rect width="960" height="544" fill="#111827"/>
  <text x="58" y="78" fill="#f9fafb" font-family="Arial, sans-serif" font-size="32" font-weight="700">Reputation Sybil Cluster Guard</text>
  <text x="58" y="120" fill="#d1d5db" font-family="Arial, sans-serif" font-size="18">${escapeXml(report.clusterId)} · ${escapeXml(report.decision)}</text>
  <rect x="58" y="160" width="790" height="36" rx="6" fill="#1f2937" stroke="#374151"/>
  <rect x="58" y="160" width="${Math.min(790, report.riskScore * 7.9)}" height="36" rx="6" fill="#dc2626"/>
  <text x="875" y="186" fill="#f9fafb" font-family="Arial, sans-serif" font-size="20" text-anchor="end">${report.riskScore}/100</text>
  <g transform="translate(58 260)">
    <rect width="250" height="126" rx="9" fill="#1f2937"/>
    <text x="28" y="52" fill="#fecaca" font-family="Arial, sans-serif" font-size="34" font-weight="700">${report.summary.blockCount}</text>
    <text x="28" y="88" fill="#d1d5db" font-family="Arial, sans-serif" font-size="17">blocking signals</text>
  </g>
  <g transform="translate(356 260)">
    <rect width="250" height="126" rx="9" fill="#1f2937"/>
    <text x="28" y="52" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="34" font-weight="700">${report.summary.userCount}</text>
    <text x="28" y="88" fill="#d1d5db" font-family="Arial, sans-serif" font-size="17">accounts reviewed</text>
  </g>
  <g transform="translate(654 260)">
    <rect width="250" height="126" rx="9" fill="#1f2937"/>
    <text x="28" y="52" fill="#fde68a" font-family="Arial, sans-serif" font-size="34" font-weight="700">${report.summary.endorsementCount}</text>
    <text x="28" y="88" fill="#d1d5db" font-family="Arial, sans-serif" font-size="17">endorsement edges</text>
  </g>
</svg>
`;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
