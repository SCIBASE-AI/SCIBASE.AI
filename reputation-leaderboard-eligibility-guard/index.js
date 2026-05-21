"use strict";

const crypto = require("node:crypto");

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function daysBetween(left, right) {
  const start = new Date(left);
  const end = new Date(right);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return Infinity;
  return Math.floor((end.valueOf() - start.valueOf()) / 86400000);
}

function evidenceTypes(candidate) {
  return new Set(asArray(candidate.evidence).map((item) => item.type).filter(Boolean));
}

function acceptedEvidence(candidate) {
  return asArray(candidate.evidence).filter((item) => item.status === "accepted");
}

function countAccepted(candidate, type) {
  return acceptedEvidence(candidate).filter((item) => item.type === type).length;
}

function reciprocalEndorsementRatio(candidate) {
  const endorsements = asArray(candidate.endorsements);
  if (endorsements.length === 0) return 0;
  const reciprocal = endorsements.filter((item) => item.relationship === "reciprocal").length;
  return reciprocal / endorsements.length;
}

function dominantInstitutionShare(candidates) {
  if (candidates.length === 0) return 0;
  const counts = new Map();
  for (const candidate of candidates) {
    counts.set(candidate.institution, (counts.get(candidate.institution) || 0) + 1);
  }
  return Math.max(...counts.values()) / candidates.length;
}

function publicDisplay(candidate, board) {
  if (candidate.anonymousReviewMode && board.visibility === "public") {
    return {
      userId: candidate.userId,
      displayName: `Private reviewer ${candidate.userId.replace(/^u-/i, "").toUpperCase()}`,
      institution: "redacted",
      redacted: true,
    };
  }
  return {
    userId: candidate.userId,
    displayName: candidate.displayName,
    institution: candidate.institution,
    redacted: false,
  };
}

function evaluateCandidate(candidate, board) {
  const blockers = [];
  const warnings = [];
  const types = evidenceTypes(candidate);
  const accepted = acceptedEvidence(candidate);
  const reproducibilityBadge = asArray(candidate.badges).find((badge) => badge.id === "reproducibility");
  const reciprocalRatio = reciprocalEndorsementRatio(candidate);

  if (accepted.length < board.policy.minAcceptedEvidence) {
    blockers.push("insufficient_accepted_evidence");
  }

  if (types.size < board.policy.minEvidenceTypes) {
    blockers.push("insufficient_evidence_diversity");
  }

  if (countAccepted(candidate, "peer_review") < board.policy.minPeerReviews) {
    blockers.push("insufficient_peer_review_service");
  }

  if (countAccepted(candidate, "contribution") < board.policy.minContributions) {
    blockers.push("insufficient_contribution_credit");
  }

  if (candidate.pendingAppeals > 0) {
    blockers.push("pending_reputation_appeal");
  }

  if (candidate.moderationHold) {
    blockers.push("active_moderation_hold");
  }

  if (reciprocalRatio > board.policy.maxReciprocalEndorsementRatio) {
    blockers.push("reciprocal_endorsement_concentration");
  }

  if (candidate.anonymousReviewMode && board.visibility === "public" && candidate.publicReviewSignalConsent !== true) {
    blockers.push("anonymous_review_signal_without_public_consent");
  }

  if (reproducibilityBadge) {
    const age = daysBetween(reproducibilityBadge.verifiedAt, board.asOf);
    if (age > board.policy.maxBadgeAgeDays) {
      warnings.push("stale_reproducibility_badge");
    }
  }

  if (candidate.score > 0 && accepted.length === 0) {
    blockers.push("score_without_evidence");
  }

  return {
    ...publicDisplay(candidate, board),
    rank: candidate.rank,
    score: candidate.score,
    domain: candidate.domain,
    region: candidate.region,
    evidenceTypes: [...types].sort(),
    acceptedEvidenceCount: accepted.length,
    reciprocalEndorsementRatio: Number(reciprocalRatio.toFixed(3)),
    blockers,
    warnings,
    eligible: blockers.length === 0,
  };
}

function buildLeaderboardEligibilityPacket(board) {
  const candidatePackets = asArray(board.candidates)
    .map((candidate) => evaluateCandidate(candidate, board))
    .sort((a, b) => a.rank - b.rank);

  const blockers = [];
  const warnings = [];
  const eligible = candidatePackets.filter((candidate) => candidate.eligible);
  const held = candidatePackets.filter((candidate) => !candidate.eligible);
  const institutionShare = dominantInstitutionShare(eligible);

  if (eligible.length < board.policy.minEligibleRankedUsers) {
    blockers.push("not_enough_eligible_ranked_users");
  }

  if (institutionShare > board.policy.maxInstitutionShare) {
    blockers.push("institution_dominance_over_threshold");
  }

  for (const candidate of candidatePackets) {
    for (const blocker of candidate.blockers) {
      blockers.push(`${candidate.userId}_${blocker}`);
    }
    for (const warning of candidate.warnings) {
      warnings.push(`${candidate.userId}_${warning}`);
    }
  }

  const publishableRanks = eligible.map((candidate, index) => ({
    ...candidate,
    publicRank: index + 1,
  }));

  const reviewerActions = held.flatMap((candidate) =>
    candidate.blockers.map((blocker) => ({
      userId: candidate.userId,
      action: `resolve_${blocker}`,
      rankHeld: candidate.rank,
    }))
  );

  if (institutionShare > board.policy.maxInstitutionShare) {
    reviewerActions.push({
      userId: "board",
      action: "rebalance_or_disclose_institution_dominance",
      rankHeld: null,
    });
  }

  const packet = {
    boardId: board.id,
    title: board.title,
    scope: board.scope,
    visibility: board.visibility,
    asOf: board.asOf,
    status: blockers.length === 0 ? "publish_ready" : "hold",
    publishableRanks,
    heldCandidates: held,
    institutionShare: Number(institutionShare.toFixed(3)),
    blockers,
    warnings,
    reviewerActions,
  };

  packet.auditDigest = digest({
    boardId: packet.boardId,
    publishableRanks,
    heldCandidates: held.map((candidate) => ({
      userId: candidate.userId,
      blockers: candidate.blockers,
      warnings: candidate.warnings,
    })),
    institutionShare: packet.institutionShare,
    blockers,
    warnings,
  });

  return packet;
}

function buildMarkdownReport(packet) {
  const lines = [
    "# Reputation Leaderboard Eligibility Report",
    "",
    `Status: ${packet.status}`,
    `Audit digest: ${packet.auditDigest}`,
    "",
    "## Board",
    "",
    `Title: ${packet.title}`,
    `Scope: ${packet.scope}`,
    `Visibility: ${packet.visibility}`,
    `Institution share: ${packet.institutionShare}`,
    "",
    "## Publishable Ranks",
    "",
    "| Rank | Researcher | Score | Evidence types |",
    "| --- | --- | ---: | --- |",
    ...packet.publishableRanks.map(
      (candidate) =>
        `| ${candidate.publicRank} | ${candidate.displayName} | ${candidate.score} | ${candidate.evidenceTypes.join(", ")} |`
    ),
    "",
    "## Held Candidates",
    "",
    ...(packet.heldCandidates.length
      ? packet.heldCandidates.map((candidate) => `- ${candidate.displayName}: ${candidate.blockers.join(", ")}`)
      : ["- none"]),
    "",
    "## Blockers",
    "",
    ...(packet.blockers.length ? packet.blockers.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Reviewer Actions",
    "",
    ...packet.reviewerActions.map((item) => `- ${item.userId}: ${item.action}`),
  ];

  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvgSummary(packet) {
  const statusColor = packet.status === "publish_ready" ? "#0f766e" : "#b42318";
  const rankRows = packet.publishableRanks
    .slice(0, 4)
    .map(
      (candidate, index) =>
        `<text x="72" y="${304 + index * 48}" class="row">#${candidate.publicRank} ${escapeXml(candidate.displayName)} - ${candidate.score} pts</text>`
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="48" width="1184" height="624" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <text x="72" y="128" class="title">Reputation Leaderboard Eligibility Guard</text>
  <text x="72" y="184" class="subtitle">${escapeXml(packet.title)}</text>
  <rect x="72" y="216" width="300" height="52" rx="12" fill="${statusColor}"/>
  <text x="94" y="250" class="status">${escapeXml(packet.status)}</text>
  <text x="420" y="250" class="metric">Eligible: ${packet.publishableRanks.length}  Held: ${packet.heldCandidates.length}</text>
  ${rankRows}
  <text x="72" y="560" class="metric">Institution share ${packet.institutionShare}; blockers ${packet.blockers.length}</text>
  <text x="72" y="612" class="digest">Audit ${packet.auditDigest.slice(0, 32)}</text>
  <style>
    .title { font: 700 42px Arial, sans-serif; fill: #0f172a; }
    .subtitle { font: 400 24px Arial, sans-serif; fill: #475569; }
    .status { font: 700 26px Arial, sans-serif; fill: white; text-transform: uppercase; }
    .metric { font: 600 24px Arial, sans-serif; fill: #334155; }
    .row { font: 500 26px Arial, sans-serif; fill: #1e293b; }
    .digest { font: 400 20px monospace; fill: #64748b; }
  </style>
</svg>
`;
}

module.exports = {
  buildLeaderboardEligibilityPacket,
  buildMarkdownReport,
  buildSvgSummary,
  digest,
  stableStringify,
};
