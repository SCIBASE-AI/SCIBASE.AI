const crypto = require("node:crypto");

const ROLE_WEIGHTS = {
  review: 8,
  methodology: 9,
  software: 9,
  validation: 10,
  "data-curation": 9,
  supervision: 7
};

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roleCoverageScore(evidenceItems) {
  const roles = new Set(evidenceItems.flatMap((item) => item.creditedRoles || []));
  const score = [...roles].reduce((total, role) => total + (ROLE_WEIGHTS[role] || 4), 0);
  return Math.min(28, score);
}

function endorsementScore(evidenceItems) {
  return Math.min(18, evidenceItems.filter((item) => item.independentEndorsement).length * 6);
}

function reproducibilityScore(evidenceItems) {
  return Math.min(18, evidenceItems.filter((item) => item.reproducibilityLinked).length * 6);
}

function visibilityScore(evidenceItems) {
  const publicCount = evidenceItems.filter((item) => item.publicMode === "public").length;
  const semiPrivateCount = evidenceItems.filter((item) => item.publicMode === "semi-private").length;
  return Math.min(12, publicCount * 4 + semiPrivateCount * 2);
}

function evidenceQualityScore(evidenceItems) {
  return Math.round(mean(evidenceItems.map((item) => item.qualityScore)) * 0.24);
}

function detectSafeguards(pair, mentor, trainee, evidenceItems) {
  const findings = [];
  if (!pair.acknowledgements.includes(pair.traineeId)) {
    findings.push({
      severity: "high",
      code: "trainee-acknowledgement-missing",
      message: `${trainee.displayName} has not acknowledged mentorship credit for ${pair.id}.`,
      task: "Hold badge promotion until the trainee acknowledges the mentorship packet."
    });
  }
  if (mentor.conflicts.includes(pair.traineeId) || trainee.conflicts.includes(pair.mentorId) || pair.declaredRelationship === "family-member") {
    findings.push({
      severity: "high",
      code: "relationship-conflict-review-required",
      message: `${pair.id} has a declared relationship conflict that can bias reputation credit.`,
      task: "Route this mentorship packet to an independent moderator before assigning badge credit."
    });
  }
  if (!evidenceItems.some((item) => item.independentEndorsement)) {
    findings.push({
      severity: "medium",
      code: "independent-endorsement-missing",
      message: `${pair.id} has no independent endorsement evidence.`,
      task: "Request an independent project owner or reviewer endorsement."
    });
  }
  if (!evidenceItems.some((item) => item.reproducibilityLinked)) {
    findings.push({
      severity: "medium",
      code: "reproducibility-evidence-missing",
      message: `${pair.id} lacks reproducibility-linked mentorship evidence.`,
      task: "Attach a rerun, validation, or artifact verification record."
    });
  }
  if (new Set(evidenceItems.map((item) => item.projectId)).size < 2 && evidenceItems.length < 4) {
    findings.push({
      severity: "low",
      code: "portfolio-breadth-low",
      message: `${pair.id} has limited project breadth for a durable mentorship badge.`,
      task: "Collect one more supervised contribution on a separate project."
    });
  }
  return findings;
}

function tierFor(score, findings, ladder) {
  if (findings.some((finding) => finding.code === "relationship-conflict-review-required")) return "moderator-review";
  if (score >= ladder.thresholds.champion) return "open-science-champion";
  if (score >= ladder.thresholds.trusted) return "trusted-mentor";
  if (score >= ladder.thresholds.emerging) return "emerging-mentor";
  return "not-yet-eligible";
}

function evaluatePair(pair, context) {
  const mentor = context.members.get(pair.mentorId);
  const trainee = context.members.get(pair.traineeId);
  const evidenceItems = pair.evidenceIds.map((id) => context.evidence.get(id)).filter(Boolean);
  const findings = detectSafeguards(pair, mentor, trainee, evidenceItems);
  const score = Math.min(100, Math.round(
    evidenceQualityScore(evidenceItems) +
    roleCoverageScore(evidenceItems) +
    endorsementScore(evidenceItems) +
    reproducibilityScore(evidenceItems) +
    visibilityScore(evidenceItems) +
    mentor.reputation * 0.08
  ));
  const tier = tierFor(score, findings, context.ladder);
  const traineeGrowth = Math.max(0, Math.round(score * 0.18 - findings.length * 2));
  const mentorDelta = tier === "moderator-review" ? 0 : Math.round(score * 0.1);
  return {
    mentorshipId: pair.id,
    mentor: { id: mentor.id, displayName: mentor.displayName },
    trainee: { id: trainee.id, displayName: trainee.displayName },
    score,
    tier,
    traineeGrowth,
    mentorDelta,
    evidenceCount: evidenceItems.length,
    creditedRoles: [...new Set(evidenceItems.flatMap((item) => item.creditedRoles || []))].sort(),
    findings,
    packetDigest: digest({
      pair,
      evidenceItems,
      score,
      tier,
      findings
    })
  };
}

function summarize(pairReports) {
  const allFindings = pairReports.flatMap((report) => report.findings);
  const countsByTier = pairReports.reduce((counts, report) => {
    counts[report.tier] = (counts[report.tier] || 0) + 1;
    return counts;
  }, {});
  const countsBySeverity = allFindings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
  return {
    averageScore: Math.round(mean(pairReports.map((report) => report.score))),
    badgeEligibleCount: pairReports.filter((report) => ["open-science-champion", "trusted-mentor", "emerging-mentor"].includes(report.tier)).length,
    moderatorReviewCount: pairReports.filter((report) => report.tier === "moderator-review").length,
    totalFindings: allFindings.length,
    countsByTier,
    countsBySeverity
  };
}

function buildInstitutionPacket(pairReports) {
  return pairReports.map((report) => ({
    mentorshipId: report.mentorshipId,
    mentorId: report.mentor.id,
    traineeId: report.trainee.id,
    tier: report.tier,
    creditedRoles: report.creditedRoles,
    traineeGrowth: report.traineeGrowth,
    mentorDelta: report.mentorDelta,
    packetDigest: report.packetDigest,
    actions: report.findings.map((finding) => finding.task)
  }));
}

function runMentorshipAudit(data) {
  const context = {
    members: byId(data.members),
    evidence: byId(data.evidence),
    ladder: data.community.ladders[0]
  };
  const pairReports = data.mentorships.map((pair) => evaluatePair(pair, context));
  const packet = {
    community: {
      id: data.community.id,
      domain: data.community.domain,
      reviewPeriod: data.community.reviewPeriod
    },
    module: "mentorship-impact-ladder",
    summary: summarize(pairReports),
    pairReports,
    institutionPacket: buildInstitutionPacket(pairReports)
  };
  return {
    ...packet,
    auditDigest: digest(packet)
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Mentorship Impact Ladder: ${report.community.domain}`,
    "",
    `Average score: **${report.summary.averageScore}**`,
    `Badge eligible pairs: **${report.summary.badgeEligibleCount}**`,
    `Moderator review pairs: **${report.summary.moderatorReviewCount}**`,
    "",
    "## Mentorship Packets"
  ];
  for (const pair of report.pairReports) {
    lines.push("", `### ${pair.mentorshipId}: ${pair.mentor.displayName} -> ${pair.trainee.displayName}`);
    lines.push(`Tier: **${pair.tier}**`);
    lines.push(`Score: **${pair.score}**`);
    lines.push(`Roles: ${pair.creditedRoles.join(", ") || "none"}`);
    if (!pair.findings.length) {
      lines.push("- No safeguards blocking badge progression.");
    } else {
      for (const finding of pair.findings) {
        lines.push(`- [${finding.severity}] ${finding.message}`);
        lines.push(`  Task: ${finding.task}`);
      }
    }
  }
  lines.push("", `Audit digest: \`${report.auditDigest}\``);
  return `${lines.join("\n")}\n`;
}

function renderSvg(report) {
  const width = 960;
  const rowHeight = 92;
  const height = 158 + report.pairReports.length * rowHeight;
  const rows = report.pairReports.map((pair, index) => {
    const y = 142 + index * rowHeight;
    const color = pair.tier === "moderator-review" ? "#c53030" : pair.score >= 88 ? "#2f855a" : pair.score >= 70 ? "#2b6cb0" : "#b7791f";
    return [
      `<text x="48" y="${y}" fill="#102033" font-size="22" font-family="Arial">${pair.mentorshipId}</text>`,
      `<rect x="164" y="${y - 24}" width="500" height="32" rx="4" fill="#e7eef6"/>`,
      `<rect x="164" y="${y - 24}" width="${Math.max(10, pair.score * 5)}" height="32" rx="4" fill="${color}"/>`,
      `<text x="686" y="${y}" fill="#102033" font-size="19" font-family="Arial">${pair.tier} (${pair.score})</text>`,
      `<text x="164" y="${y + 34}" fill="#4a5568" font-size="16" font-family="Arial">${pair.mentor.displayName} -> ${pair.trainee.displayName} | ${pair.findings.length} finding(s)</text>`
    ].join("");
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f7fafc"/>`,
    `<rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="8" fill="#ffffff" stroke="#cbd5e0"/>`,
    `<text x="48" y="72" fill="#102033" font-size="30" font-weight="700" font-family="Arial">Mentorship Impact Ladder</text>`,
    `<text x="48" y="104" fill="#4a5568" font-size="18" font-family="Arial">Eligible ${report.summary.badgeEligibleCount} | Moderator review ${report.summary.moderatorReviewCount} | Audit ${report.auditDigest.slice(0, 12)}</text>`,
    rows,
    `</svg>`
  ].join("");
}

module.exports = {
  runMentorshipAudit,
  evaluatePair,
  renderMarkdown,
  renderSvg,
  digest
};
