const crypto = require("crypto");

function institutionCount(cohort) {
  return Object.keys(cohort.institutionBreakdown || {}).length;
}

function largestInstitutionShare(cohort) {
  const values = Object.values(cohort.institutionBreakdown || {});
  if (values.length === 0 || cohort.contributorCount === 0) {
    return 0;
  }
  return round(Math.max(...values) / cohort.contributorCount);
}

function privacyRiskScore(cohort) {
  let score = 0;
  if (cohort.contributorCount < cohort.minCohortSize) score += 35;
  if (institutionCount(cohort) < cohort.minInstitutionCount) score += 20;
  if (largestInstitutionShare(cohort) > 0.65 && cohort.leaderboardType !== "institution") score += 18;
  if (cohort.sparseBadgeCombinations > 0) score += cohort.sparseBadgeCombinations * 8;
  if (cohort.anonymousCreditShare > 0.25) score += 20;
  if (cohort.optOutContributors > 0) score += 25;
  if (cohort.maxScoreDelta > 15) score += 15;
  return Math.min(100, score);
}

function evaluateCohort(cohort) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const institutions = institutionCount(cohort);
  const largestShare = largestInstitutionShare(cohort);

  if (cohort.contributorCount < cohort.minCohortSize) {
    blockers.push(`cohort has ${cohort.contributorCount} contributors, below ${cohort.minCohortSize} minimum`);
    actions.push("hold public leaderboard until cohort has enough contributors");
  }

  if (institutions < cohort.minInstitutionCount) {
    blockers.push(`institution diversity ${institutions} is below ${cohort.minInstitutionCount}`);
    actions.push("aggregate with a broader cohort before publication");
  }

  if (largestShare > 0.65 && cohort.leaderboardType !== "institution") {
    blockers.push(`largest institution share ${largestShare} exceeds 0.65`);
    actions.push("redact institution-specific rank signals");
  }

  if (cohort.sparseBadgeCombinations > 0) {
    blockers.push(`${cohort.sparseBadgeCombinations} sparse badge combinations can identify contributors`);
    actions.push("collapse rare badge combinations into aggregate labels");
  }

  if (cohort.anonymousCreditShare > 0.25 && cohort.releaseMode === "public") {
    blockers.push(`anonymous review credit share ${cohort.anonymousCreditShare} is too high for public ranking`);
    actions.push("publish anonymous review credit as aggregate only");
  }

  if (cohort.optOutContributors > 0) {
    blockers.push(`${cohort.optOutContributors} contributors opted out of leaderboard display`);
    actions.push("remove opted-out contributors before release");
  }

  if (cohort.maxScoreDelta > 15) {
    warnings.push(`max score delta ${cohort.maxScoreDelta} needs moderation review`);
    actions.push("queue score spike for moderator review");
  }

  if (cohort.visibleRankCount > cohort.contributorCount) {
    warnings.push("visible rank count exceeds contributor count");
    actions.push("cap visible ranks to available contributors");
  }

  if (blockers.length === 0 && warnings.length === 0) {
    actions.push("publish leaderboard cohort");
  } else if (blockers.length === 0) {
    actions.push("publish after moderation review");
  }

  const decision = blockers.length > 0 ? "hold" : warnings.length > 0 ? "redact" : "publish";
  const result = {
    cohortId: cohort.id,
    leaderboardType: cohort.leaderboardType,
    label: cohort.label,
    domain: cohort.domain,
    region: cohort.region,
    institution: cohort.institution,
    contributorCount: cohort.contributorCount,
    institutionCount: institutions,
    largestInstitutionShare: largestShare,
    privacyRiskScore: privacyRiskScore(cohort),
    decision,
    blockers,
    warnings,
    actions: [...new Set(actions)],
  };

  return {
    ...result,
    auditDigest: digest(result),
  };
}

function evaluateCohortBatch(cohorts) {
  const decisions = cohorts.map(evaluateCohort);
  const summary = decisions.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.decision] += 1;
      acc.blockers += item.blockers.length;
      acc.warnings += item.warnings.length;
      if (item.privacyRiskScore > acc.maxPrivacyRiskScore) {
        acc.maxPrivacyRiskScore = item.privacyRiskScore;
      }
      return acc;
    },
    {
      total: 0,
      publish: 0,
      redact: 0,
      hold: 0,
      blockers: 0,
      warnings: 0,
      maxPrivacyRiskScore: 0,
    }
  );

  const report = {
    generatedAt: new Date("2026-05-31T00:00:00Z").toISOString(),
    summary,
    decisions,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function renderMarkdownReport(report) {
  const lines = [
    "# Reputation Leaderboard Cohort Privacy Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Cohorts: ${report.summary.total}`,
    `- Publish: ${report.summary.publish}`,
    `- Redact: ${report.summary.redact}`,
    `- Hold: ${report.summary.hold}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Max privacy risk score: ${report.summary.maxPrivacyRiskScore}`,
    "",
    "## Decisions",
    "",
  ];

  for (const item of report.decisions) {
    lines.push(`### ${item.cohortId}`);
    lines.push("");
    lines.push(`- Type: ${item.leaderboardType}`);
    lines.push(`- Label: ${item.label}`);
    lines.push(`- Decision: ${item.decision}`);
    lines.push(`- Contributors: ${item.contributorCount}`);
    lines.push(`- Institution count: ${item.institutionCount}`);
    lines.push(`- Largest institution share: ${item.largestInstitutionShare}`);
    lines.push(`- Privacy risk score: ${item.privacyRiskScore}`);
    lines.push(`- Blockers: ${item.blockers.join("; ") || "none"}`);
    lines.push(`- Warnings: ${item.warnings.join("; ") || "none"}`);
    lines.push(`- Actions: ${item.actions.join("; ")}`);
    lines.push(`- Digest: ${item.auditDigest}`);
    lines.push("");
  }

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgReport(report) {
  const cards = [
    ["Cohorts", report.summary.total, "#264653"],
    ["Publish", report.summary.publish, "#2a9d8f"],
    ["Redact", report.summary.redact, "#e9c46a"],
    ["Hold", report.summary.hold, "#e76f51"],
    ["Blockers", report.summary.blockers, "#8d3b72"],
    ["Max risk", report.summary.maxPrivacyRiskScore, "#457b9d"],
  ];

  const cardSvg = cards
    .map(([label, value, color], index) => {
      const x = 70 + (index % 3) * 382;
      const y = 184 + Math.floor(index / 3) * 148;
      return [
        `<rect x="${x}" y="${y}" width="322" height="108" rx="8" fill="#ffffff" stroke="#d8dee8"/>`,
        `<rect x="${x}" y="${y}" width="10" height="108" rx="4" fill="${color}"/>`,
        `<text x="${x + 30}" y="${y + 42}" font-size="24" font-family="Arial" fill="#344054">${escapeXml(label)}</text>`,
        `<text x="${x + 30}" y="${y + 82}" font-size="34" font-family="Arial" font-weight="700" fill="${color}">${escapeXml(value)}</text>`,
      ].join("\n");
    })
    .join("\n");

  const queueRows = report.decisions
    .filter((item) => item.decision !== "publish")
    .slice(0, 4)
    .map((item, index) => {
      const y = 528 + index * 31;
      return `<text x="82" y="${y}" font-size="20" font-family="Arial" fill="#344054">${escapeXml(item.cohortId)} - ${escapeXml(item.decision)} - ${escapeXml(item.actions[0])}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f7f8fb"/>
  <rect x="44" y="44" width="1192" height="632" rx="12" fill="#ffffff" stroke="#d8dee8"/>
  <text x="72" y="104" font-size="38" font-family="Arial" font-weight="700" fill="#182230">Reputation Leaderboard Privacy Guard</text>
  <text x="72" y="145" font-size="22" font-family="Arial" fill="#667085">Cohort safety checks before public ranking release</text>
  ${cardSvg}
  <text x="72" y="486" font-size="27" font-family="Arial" font-weight="700" fill="#182230">Redaction queue</text>
  ${queueRows}
  <text x="72" y="655" font-size="18" font-family="Arial" fill="#667085">Audit digest ${escapeXml(report.auditDigest.slice(0, 32))}</text>
</svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

module.exports = {
  digest,
  evaluateCohort,
  evaluateCohortBatch,
  institutionCount,
  largestInstitutionShare,
  privacyRiskScore,
  renderMarkdownReport,
  renderSvgReport,
};
