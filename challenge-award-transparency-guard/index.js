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

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(value) {
  return Math.round(value) / 100;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function byId(items) {
  return new Map(asArray(items).map((item) => [item.id, item]));
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displaySubmission(submission, challenge) {
  const needsRedaction =
    challenge.visibility !== "public" &&
    submission.publicIdentityConsent !== true &&
    submission.awardPublicConsent !== true;

  return {
    submissionId: submission.id,
    displayName: needsRedaction
      ? `Private finalist ${submission.id.replace(/^sub-/i, "").toUpperCase()}`
      : submission.teamName,
    institution: needsRedaction ? "redacted" : submission.institution,
    anonymous: needsRedaction,
  };
}

function weightedScore(result, rubric) {
  return fromCents(
    rubric.reduce((total, criterion) => {
      const raw = Number(result.scoreBreakdown?.[criterion.id]);
      if (!Number.isFinite(raw)) return total;
      return total + raw * Number(criterion.weight || 0);
    }, 0)
  );
}

function validateRubric(challenge, blockers) {
  const rubric = asArray(challenge.rubric);
  if (rubric.length === 0) {
    blockers.push("missing_rubric");
    return;
  }

  const weight = fromCents(rubric.reduce((total, item) => total + Number(item.weight || 0), 0) * 100);
  if (Math.abs(weight - 100) > 0.01) {
    blockers.push(`rubric_weights_total_${weight}_not_100`);
  }

  const seen = new Set();
  for (const criterion of rubric) {
    if (!criterion.id || !criterion.label) {
      blockers.push("rubric_criterion_missing_id_or_label");
    }
    if (seen.has(criterion.id)) {
      blockers.push(`duplicate_rubric_criterion_${criterion.id}`);
    }
    seen.add(criterion.id);
  }
}

function validateResults(challenge, blockers, warnings) {
  const submissions = byId(challenge.submissions);
  const rubric = asArray(challenge.rubric);
  const results = asArray(challenge.finalResults);

  if (results.length === 0) {
    blockers.push("missing_final_results");
    return [];
  }

  const ranks = new Set();
  const normalized = [];

  for (const result of results) {
    const submission = submissions.get(result.submissionId);
    if (!submission) {
      blockers.push(`result_references_unknown_submission_${result.submissionId}`);
      continue;
    }

    if (!Number.isInteger(result.rank) || result.rank < 1) {
      blockers.push(`invalid_rank_for_${result.submissionId}`);
    } else if (ranks.has(result.rank)) {
      blockers.push(`duplicate_rank_${result.rank}`);
    }
    ranks.add(result.rank);

    const missingCriteria = rubric
      .filter((criterion) => !Number.isFinite(Number(result.scoreBreakdown?.[criterion.id])))
      .map((criterion) => criterion.id);
    if (missingCriteria.length > 0) {
      blockers.push(`missing_score_breakdown_${result.submissionId}_${missingCriteria.join("_")}`);
    }

    const computedScore = weightedScore(result, rubric);
    if (Number.isFinite(Number(result.totalScore)) && Math.abs(Number(result.totalScore) - computedScore) > 0.05) {
      warnings.push(`reported_score_differs_from_weighted_score_${result.submissionId}`);
    }

    normalized.push({
      ...displaySubmission(submission, challenge),
      rank: result.rank,
      awardUsd: Number(result.awardUsd || 0),
      weightedScore: computedScore,
      rationale: result.rationale || "No rationale supplied.",
      ipTransferRequested: result.ipTransferRequested === true,
      payoutStatus: result.payoutStatus || "pending",
    });
  }

  return normalized.sort((a, b) => a.rank - b.rank);
}

function validateEscrowAndPayouts(challenge, results, blockers) {
  const escrow = challenge.escrow || {};
  const totalAwardCents = results.reduce((total, result) => total + toCents(result.awardUsd), 0);
  const clearedCents = toCents(escrow.clearedUsd);

  if (escrow.status !== "cleared") {
    blockers.push(`escrow_status_${escrow.status || "missing"}_not_cleared`);
  }

  if (totalAwardCents <= 0) {
    blockers.push("award_total_is_zero");
  }

  if (totalAwardCents > clearedCents) {
    blockers.push(`award_total_${fromCents(totalAwardCents)}_exceeds_cleared_escrow_${fromCents(clearedCents)}`);
  }

  for (const result of results) {
    if (result.ipTransferRequested && !["authorized", "paid", "queued"].includes(result.payoutStatus)) {
      blockers.push(`ip_transfer_before_payout_ready_${result.submissionId}`);
    }
  }

  return {
    clearedUsd: fromCents(clearedCents),
    plannedAwardUsd: fromCents(totalAwardCents),
    remainingEscrowUsd: fromCents(clearedCents - totalAwardCents),
    currency: escrow.currency || "USD",
  };
}

function validateAppeals(challenge, blockers, warnings) {
  const appeals = challenge.appeals || {};
  const closesAt = parseDate(appeals.closesAt);
  const payoutReleaseAt = parseDate(challenge.payoutReleaseAt);

  if (!closesAt) {
    blockers.push("missing_valid_appeal_window_close");
  }

  if (Number(appeals.pendingCount || 0) > 0) {
    blockers.push(`pending_appeals_${appeals.pendingCount}`);
  }

  if (closesAt && payoutReleaseAt && payoutReleaseAt <= closesAt) {
    blockers.push("payout_release_before_appeal_window_closes");
  }

  if (closesAt && parseDate(challenge.awardAnnouncementAt) && parseDate(challenge.awardAnnouncementAt) > closesAt) {
    warnings.push("award_announcement_after_appeal_window_close");
  }

  return {
    opensAt: appeals.opensAt || null,
    closesAt: appeals.closesAt || null,
    pendingCount: Number(appeals.pendingCount || 0),
    policyUrl: appeals.policyUrl || null,
  };
}

function validateReviewerDisclosures(challenge, blockers, warnings) {
  const reviewers = asArray(challenge.reviewers);
  if (reviewers.length === 0) {
    blockers.push("missing_reviewer_panel");
    return [];
  }

  const summary = [];
  for (const reviewer of reviewers) {
    if (!reviewer.role) {
      warnings.push(`reviewer_missing_role_${reviewer.id}`);
    }
    if (reviewer.conflictStatus === "unresolved") {
      blockers.push(`unresolved_reviewer_conflict_${reviewer.id}`);
    }
    if (reviewer.conflictStatus && !reviewer.disclosureSummary) {
      blockers.push(`reviewer_conflict_without_disclosure_${reviewer.id}`);
    }
    summary.push({
      reviewerId: reviewer.id,
      role: reviewer.role || "reviewer",
      conflictStatus: reviewer.conflictStatus || "none",
      disclosureSummary: reviewer.disclosureSummary || "No conflicts declared.",
    });
  }

  return summary;
}

function validateSolverNotices(challenge, blockers) {
  const notices = asArray(challenge.notifications);
  const noticeBySubmission = new Map(
    notices
      .filter((notice) => notice.type === "award_result")
      .map((notice) => [notice.submissionId, notice])
  );

  const announcementAt = parseDate(challenge.awardAnnouncementAt);
  const noticePackets = [];

  for (const submission of asArray(challenge.submissions)) {
    const notice = noticeBySubmission.get(submission.id);
    if (!notice) {
      blockers.push(`missing_solver_result_notice_${submission.id}`);
      continue;
    }
    const sentAt = parseDate(notice.sentAt);
    if (!sentAt) {
      blockers.push(`invalid_solver_notice_timestamp_${submission.id}`);
    } else if (announcementAt && sentAt > announcementAt) {
      blockers.push(`solver_notice_after_public_announcement_${submission.id}`);
    }
    noticePackets.push({
      submissionId: submission.id,
      sentAt: notice.sentAt,
      channel: notice.channel || "platform",
      includesAppealInstructions: notice.includesAppealInstructions === true,
    });
    if (notice.includesAppealInstructions !== true) {
      blockers.push(`solver_notice_missing_appeal_instructions_${submission.id}`);
    }
  }

  return noticePackets;
}

function validateDisclosureArtifacts(challenge, blockers, warnings) {
  const submissions = byId(challenge.submissions);
  const artifacts = asArray(challenge.publicPreviewArtifacts);
  const packets = [];

  for (const artifact of artifacts) {
    const submission = submissions.get(artifact.submissionId);
    if (!submission) {
      blockers.push(`public_artifact_unknown_submission_${artifact.submissionId}`);
      continue;
    }
    if (challenge.visibility !== "public" && submission.unpaidIpSensitive && artifact.redacted !== true) {
      blockers.push(`unredacted_private_ip_artifact_${artifact.id}`);
    }
    if (!artifact.digest) {
      warnings.push(`artifact_without_digest_${artifact.id}`);
    }
    packets.push({
      id: artifact.id,
      submissionId: artifact.submissionId,
      label: artifact.label,
      redacted: artifact.redacted === true,
      digest: artifact.digest || null,
    });
  }

  return packets;
}

function buildAwardTransparencyPacket(challenge) {
  const blockers = [];
  const warnings = [];

  validateRubric(challenge, blockers);
  const rankedResults = validateResults(challenge, blockers, warnings);
  const escrow = validateEscrowAndPayouts(challenge, rankedResults, blockers);
  const appeals = validateAppeals(challenge, blockers, warnings);
  const reviewerDisclosures = validateReviewerDisclosures(challenge, blockers, warnings);
  const solverNotices = validateSolverNotices(challenge, blockers);
  const publicArtifacts = validateDisclosureArtifacts(challenge, blockers, warnings);

  const announcement = {
    challengeId: challenge.id,
    title: challenge.title,
    visibility: challenge.visibility || "public",
    awardAnnouncementAt: challenge.awardAnnouncementAt,
    sponsor: challenge.sponsor?.name || "Unknown sponsor",
    rankedResults,
    reviewerDisclosures,
    appeals,
    escrow,
    publicArtifacts,
    ipPolicy: {
      default: challenge.ipPolicy?.default || "solver_retains_until_paid",
      transferTrigger: challenge.ipPolicy?.transferTrigger || "authorized_payout",
    },
  };

  const auditInput = {
    announcement,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    sourceManifestDigest: challenge.sourceManifestDigest || null,
  };

  const packet = {
    status: blockers.length === 0 ? "publish_ready" : "hold",
    blockers,
    warnings,
    announcement,
    solverNotices,
    requiredActions:
      blockers.length === 0
        ? ["publish_award_announcement", "queue_payouts_after_appeal_window"]
        : blockers.map((blocker) => `resolve_${blocker}`),
    auditDigest: digest(auditInput),
  };

  return packet;
}

function buildMarkdownReport(packet) {
  const lines = [
    "# Challenge Award Transparency Report",
    "",
    `Status: ${packet.status}`,
    `Audit digest: ${packet.auditDigest}`,
    "",
    "## Award Summary",
    "",
    `Challenge: ${packet.announcement.title}`,
    `Sponsor: ${packet.announcement.sponsor}`,
    `Visibility: ${packet.announcement.visibility}`,
    `Cleared escrow: ${packet.announcement.escrow.clearedUsd} ${packet.announcement.escrow.currency}`,
    `Planned awards: ${packet.announcement.escrow.plannedAwardUsd} ${packet.announcement.escrow.currency}`,
    "",
    "| Rank | Finalist | Award USD | Weighted score | IP transfer |",
    "| --- | --- | ---: | ---: | --- |",
    ...packet.announcement.rankedResults.map((result) =>
      `| ${result.rank} | ${result.displayName} | ${result.awardUsd} | ${result.weightedScore} | ${result.ipTransferRequested ? "yes" : "no"} |`
    ),
    "",
    "## Appeal Window",
    "",
    `Opens: ${packet.announcement.appeals.opensAt || "missing"}`,
    `Closes: ${packet.announcement.appeals.closesAt || "missing"}`,
    `Pending appeals: ${packet.announcement.appeals.pendingCount}`,
    "",
    "## Blockers",
    "",
    ...(packet.blockers.length ? packet.blockers.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Warnings",
    "",
    ...(packet.warnings.length ? packet.warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Required Actions",
    "",
    ...packet.requiredActions.map((item) => `- ${item}`),
  ];

  return `${lines.join("\n")}\n`;
}

function buildSvgSummary(packet) {
  const statusColor = packet.status === "publish_ready" ? "#0f766e" : "#b42318";
  const rows = packet.announcement.rankedResults
    .slice(0, 4)
    .map(
      (result, index) =>
        `<text x="72" y="${300 + index * 48}" class="row">#${result.rank} ${escapeXml(result.displayName)} - $${result.awardUsd} - score ${result.weightedScore}</text>`
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="48" width="1184" height="624" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <text x="72" y="128" class="title">Challenge Award Transparency Guard</text>
  <text x="72" y="184" class="subtitle">${escapeXml(packet.announcement.title)}</text>
  <rect x="72" y="216" width="320" height="52" rx="12" fill="${statusColor}"/>
  <text x="94" y="250" class="status">${escapeXml(packet.status)}</text>
  <text x="440" y="250" class="metric">Blockers: ${packet.blockers.length}  Warnings: ${packet.warnings.length}</text>
  ${rows}
  <text x="72" y="560" class="metric">Escrow $${packet.announcement.escrow.clearedUsd} / awards $${packet.announcement.escrow.plannedAwardUsd}</text>
  <text x="72" y="612" class="digest">Audit ${packet.auditDigest.slice(0, 32)}</text>
  <style>
    .title { font: 700 44px Arial, sans-serif; fill: #0f172a; }
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
  buildAwardTransparencyPacket,
  buildMarkdownReport,
  buildSvgSummary,
  digest,
  stableStringify,
};
