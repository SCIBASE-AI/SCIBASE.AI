const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 32,
  high: 17,
  medium: 8,
  low: 3,
};

function stableStringify(value) {
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

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function finding(severity, code, title, evidence, action) {
  return { severity, code, title, evidence, action };
}

function hoursBetween(startIso, endIso) {
  return Math.abs(new Date(endIso).getTime() - new Date(startIso).getTime()) / 36e5;
}

function reputationEventsForUser(events, userId) {
  return events.filter((event) => event.targetUserId === userId || event.actorUserId === userId);
}

function verifyReciprocalEndorsements(packet, policy) {
  const findings = [];
  const windowHours = policy.reciprocalWindowHours || 72;
  const endorsements = packet.events.filter((event) => event.type === "endorsement");

  endorsements.forEach((event) => {
    const reciprocal = endorsements.find((candidate) => (
      candidate.actorUserId === event.targetUserId
      && candidate.targetUserId === event.actorUserId
      && candidate.id !== event.id
      && hoursBetween(event.createdAt, candidate.createdAt) <= windowHours
    ));

    if (reciprocal) {
      findings.push(finding(
        "high",
        "RECIPROCAL_ENDORSEMENT_WINDOW",
        "Reciprocal endorsements occurred inside the ring-risk window",
        `${event.actorUserId}<->${event.targetUserId} within ${windowHours}h via ${event.id}/${reciprocal.id}.`,
        "Hold the reputation delta until reviewers validate that the endorsements are independent.",
      ));
    }
  });

  return findings;
}

function verifyBurstPatterns(packet, policy) {
  const findings = [];
  const maxBurstCount = policy.maxEndorsementsPerActorWindow || 4;
  const windowHours = policy.burstWindowHours || 24;
  const byActor = new Map();

  packet.events
    .filter((event) => event.type === "endorsement")
    .forEach((event) => {
      byActor.set(event.actorUserId, [...(byActor.get(event.actorUserId) || []), event]);
    });

  byActor.forEach((events, actorUserId) => {
    const sorted = events.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    sorted.forEach((event, index) => {
      const window = sorted.filter((candidate) => hoursBetween(event.createdAt, candidate.createdAt) <= windowHours);
      if (window.length > maxBurstCount) {
        findings.push(finding(
          "medium",
          "ENDORSEMENT_BURST_PATTERN",
          "Endorsement burst exceeds normal review cadence",
          `${actorUserId} created ${window.length} endorsements within ${windowHours}h near ${sorted[index].createdAt}.`,
          "Rate-limit endorsement impact and ask for evidence on the bursted reputation events.",
        ));
      }
    });
  });

  return findings;
}

function verifySharedSignals(packet, policy) {
  const findings = [];
  const maxSharedSignalEdges = policy.maxSharedSignalEdges || 2;
  const signalEdges = packet.events.filter((event) => (
    event.type === "endorsement"
    && (
      event.signals?.sharedDeviceFingerprint
      || event.signals?.sharedRecoveryEmail
      || event.signals?.sameInviteBatch
      || event.signals?.sameAffiliationDomain
    )
  ));

  if (signalEdges.length > maxSharedSignalEdges) {
    findings.push(finding(
      "blocker",
      "SHARED_SIGNAL_ENDORSEMENT_CLUSTER",
      "Endorsement cluster shares too many identity or affiliation signals",
      `${signalEdges.length} endorsement edges share device, recovery, invite, or affiliation signals.`,
      "Freeze the cluster and require manual identity/reputation review before applying scores.",
    ));
  }

  return findings;
}

function verifyReviewerOverlap(packet, policy) {
  const findings = [];
  const maxOverlap = policy.maxReviewerOverlapRatio || 0.6;

  packet.reputationChanges.forEach((change) => {
    const reviewers = change.reviewers || [];
    const uniqueReviewers = new Set(reviewers);
    const overlapRatio = reviewers.length ? 1 - uniqueReviewers.size / reviewers.length : 0;
    if (overlapRatio > maxOverlap) {
      findings.push(finding(
        "high",
        "REVIEWER_OVERLAP_TOO_HIGH",
        "Reputation change relies on overlapping reviewers",
        `${change.id} overlap ratio=${overlapRatio.toFixed(2)} from ${reviewers.length} reviewer slots.`,
        "Require independent reviewers before applying the reputation or badge delta.",
      ));
    }
  });

  return findings;
}

function verifyEvidence(packet) {
  const findings = [];

  packet.events.forEach((event) => {
    if (event.type === "endorsement" && !event.evidenceUrl && !event.projectContributionId) {
      findings.push(finding(
        "medium",
        "ENDORSEMENT_EVIDENCE_MISSING",
        "Endorsement lacks project evidence",
        `${event.id} has no evidence URL or project contribution ID.`,
        "Keep the endorsement visible as social context only until contribution evidence is attached.",
      ));
    }
  });

  packet.reputationChanges.forEach((change) => {
    if (change.badgeAwarded && !change.badgeCriteriaSnapshotId) {
      findings.push(finding(
        "high",
        "BADGE_CRITERIA_SNAPSHOT_MISSING",
        "Badge award lacks criteria snapshot",
        `${change.id} awards ${change.badgeAwarded} without criteria evidence.`,
        "Block badge publication until criteria and evidence snapshots are stored.",
      ));
    }
  });

  return findings;
}

function verifyTargetRisk(packet, policy) {
  const findings = [];
  const maxDailyDelta = policy.maxDailyReputationDelta || 40;

  packet.users.forEach((user) => {
    const totalDelta = packet.reputationChanges
      .filter((change) => change.targetUserId === user.id)
      .reduce((sum, change) => sum + change.delta, 0);

    if (totalDelta > maxDailyDelta && reputationEventsForUser(packet.events, user.id).length <= 3) {
      findings.push(finding(
        "high",
        "REPUTATION_DELTA_OUTPACES_EVIDENCE",
        "Reputation delta outpaces supporting evidence",
        `${user.id} gained ${totalDelta} reputation with few supporting events.`,
        "Cap the daily reputation delta until more independent project evidence is present.",
      ));
    }
  });

  return findings;
}

function auditEndorsementRing(packet, policy = {}) {
  const findings = [
    ...verifyReciprocalEndorsements(packet, policy),
    ...verifyBurstPatterns(packet, policy),
    ...verifySharedSignals(packet, policy),
    ...verifyReviewerOverlap(packet, policy),
    ...verifyEvidence(packet),
    ...verifyTargetRisk(packet, policy),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "freeze-reputation-cluster"
    : high
      ? "manual-reputation-review"
      : findings.length
        ? "apply-with-reputation-caveats"
        : "safe-to-apply-reputation";

  const packetSummary = {
    batchId: packet.batchId,
    reviewedAt: policy.reviewDate,
    decision,
    riskScore,
    userCount: packet.users.length,
    eventCount: packet.events.length,
    reputationChangeCount: packet.reputationChanges.length,
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-reputation-events-only",
  };

  return {
    ...packetSummary,
    auditDigest: digest(packetSummary),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Endorsement Ring Audit",
    "",
    `Batch: ${result.batchId}`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Users: ${result.userCount}`,
    `Events: ${result.eventCount}`,
    `Reputation changes: ${result.reputationChangeCount}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
  ];

  if (!result.findings.length) {
    lines.push("- No endorsement-ring risks detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }

  lines.push("", "## Safety", "- Synthetic reputation events only; no live profiles, private messages, identity providers, device fingerprints, credentials, or external APIs.");
  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const color = result.decision === "freeze-reputation-cluster"
    ? "#b42318"
    : result.decision === "safe-to-apply-reputation"
      ? "#067647"
      : "#b54708";
  const metrics = [
    ["users", result.userCount],
    ["events", result.eventCount],
    ["changes", result.reputationChangeCount],
    ["findings", result.findings.length],
  ];
  const maxValue = Math.max(...metrics.map((item) => item[1]), 1);
  const bars = metrics.map(([label, count], index) => {
    const y = 202 + index * 54;
    const width = Math.round(470 * count / maxValue);
    return `<text x="36" y="${y}" font-family="Arial" font-size="18" fill="#344054">${escapeXml(label)}</text>
  <rect x="190" y="${y - 22}" width="470" height="28" rx="5" fill="#eaecf0"/>
  <rect x="190" y="${y - 22}" width="${width}" height="28" rx="5" fill="${label === "findings" ? "#b42318" : "#12b76a"}"/>
  <text x="686" y="${y}" font-family="Arial" font-size="18" fill="#344054">${count}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="450" viewBox="0 0 960 450" role="img" aria-label="Endorsement ring audit summary">
  <rect width="960" height="450" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="402" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Endorsement Ring Audit</text>
  <rect x="36" y="98" width="390" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="456" y="129" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${bars}
  <text x="36" y="416" font-family="Arial" font-size="18" fill="#667085">Synthetic reputation events only. No live profile or device lookups.</text>
</svg>
`;
}

module.exports = {
  auditEndorsementRing,
  digest,
  hoursBetween,
  renderMarkdownReport,
  renderSvgSummary,
};
