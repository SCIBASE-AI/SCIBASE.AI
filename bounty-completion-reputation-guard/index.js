const DIFFICULTY_MULTIPLIERS = {
  standard: 1,
  advanced: 1.35,
  expert: 1.75,
};

const RESULT_POINTS = {
  winner: 80,
  milestone: 45,
  "honorable-mention": 25,
  submitted: 4,
};

function addFinding(findings, severity, code, message, evidence, action) {
  findings.push({ severity, code, message, evidence, action });
}

function checkAcceptance(completion, findings) {
  if (!completion.sponsorAccepted || !completion.evidence.acceptanceReceipt) {
    addFinding(
      findings,
      "critical",
      "missing-sponsor-acceptance",
      "Bounty completion lacks sponsor acceptance evidence.",
      completion.challenge,
      "Do not award completion reputation until sponsor acceptance is recorded.",
    );
  }

  if (!completion.evidence.deliverableHash) {
    addFinding(
      findings,
      "high",
      "missing-deliverable-hash",
      "Completion record lacks immutable deliverable evidence.",
      completion.challenge,
      "Attach deliverable hash before reputation or citation-page credit is awarded.",
    );
  }

  if (!completion.evidence.arbitrationDigest && completion.result !== "submitted") {
    addFinding(
      findings,
      "high",
      "missing-arbitration-digest",
      "Accepted or awarded completion lacks arbitration or evaluation digest.",
      completion.challenge,
      "Attach evaluation digest so challenge-performance reputation is explainable.",
    );
  }
}

function checkSettlementAndAppeals(completion, findings) {
  if (completion.settlementStatus !== "paid" && completion.result !== "submitted") {
    addFinding(
      findings,
      completion.settlementStatus === "held" ? "critical" : "high",
      "settlement-not-paid",
      "Awarded bounty completion is not fully settled.",
      completion.settlementStatus,
      "Hold or mark reputation as provisional until prize settlement is paid.",
    );
  }

  if (completion.appealStatus === "open") {
    addFinding(
      findings,
      "critical",
      "appeal-open",
      "Completion has an open appeal or arbitration hold.",
      completion.challenge,
      "Freeze reputation deltas, badges, and leaderboard impact until appeal closes.",
    );
  }

  if (completion.ipReleaseStatus !== "released-after-payment" && completion.result !== "submitted") {
    addFinding(
      findings,
      "high",
      "ip-release-not-final",
      "IP or public release state is not final for this completion.",
      completion.ipReleaseStatus,
      "Keep citation-page and public badge credit provisional until IP/release state is final.",
    );
  }

  if (!completion.evidence.settlementReceipt && completion.result !== "submitted") {
    addFinding(
      findings,
      "high",
      "missing-settlement-receipt",
      "Completion lacks settlement receipt evidence.",
      completion.challenge,
      "Attach payment or settlement receipt before final reputation posting.",
    );
  }
}

function checkTeamAttribution(completion, findings) {
  if (!completion.evidence.teamSplitLedger) {
    addFinding(
      findings,
      "high",
      "missing-team-split-ledger",
      "Team completion lacks split-attribution evidence.",
      completion.challenge,
      "Attach team split ledger before distributing reputation deltas.",
    );
  }

  if (completion.teamSharePct <= 0 || completion.teamSharePct > 100) {
    addFinding(
      findings,
      "critical",
      "invalid-team-share",
      "Team share is outside the valid 1-100 percent range.",
      `${completion.teamSharePct}`,
      "Correct contributor share before updating profiles, badges, or leaderboards.",
    );
  }

  if ((completion.priorCreditKeys || []).includes(completion.duplicateCreditKey)) {
    addFinding(
      findings,
      "critical",
      "duplicate-completion-credit",
      "Completion appears to have already contributed reputation credit.",
      completion.duplicateCreditKey,
      "Block duplicate reputation credit and preserve one canonical completion receipt.",
    );
  }
}

function basePoints(completion) {
  const resultPoints = RESULT_POINTS[completion.result] || 0;
  const multiplier = DIFFICULTY_MULTIPLIERS[completion.difficulty] || 1;
  const share = Math.max(0, Math.min(100, completion.teamSharePct || 0)) / 100;
  return Math.round(resultPoints * multiplier * share);
}

function decisionFromFindings(findings) {
  const critical = findings.filter((finding) => finding.severity === "critical").length;
  const high = findings.filter((finding) => finding.severity === "high").length;

  if (critical > 0) return "block-reputation-credit";
  if (high > 0) return "provisional-credit";
  return "award-final-credit";
}

function reputationDelta(completion, findings) {
  const decision = decisionFromFindings(findings);
  if (decision === "block-reputation-credit") return 0;
  if (decision === "provisional-credit") return Math.round(basePoints(completion) * 0.25);
  return basePoints(completion);
}

function severityCounts(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
}

function uniqueActions(findings) {
  const actions = findings.map((finding) => finding.action);
  if (actions.length === 0) {
    actions.push("Post final bounty-completion reputation credit and update badge/leaderboard eligibility.");
  }
  return Array.from(new Set(actions));
}

function reviewCompletion(completion) {
  const findings = [];

  checkAcceptance(completion, findings);
  checkSettlementAndAppeals(completion, findings);
  checkTeamAttribution(completion, findings);

  return {
    completionId: completion.id,
    researcher: completion.researcher,
    challenge: completion.challenge,
    result: completion.result,
    difficulty: completion.difficulty,
    decision: decisionFromFindings(findings),
    basePoints: basePoints(completion),
    reputationDelta: reputationDelta(completion, findings),
    findingCount: findings.length,
    severityCounts: severityCounts(findings),
    findings,
    actions: uniqueActions(findings),
  };
}

function reviewCompletions(completions) {
  const results = completions.map(reviewCompletion);
  const summary = {
    completionsReviewed: results.length,
    finalCredits: results.filter((result) => result.decision === "award-final-credit").length,
    provisionalCredits: results.filter((result) => result.decision === "provisional-credit").length,
    blockedCredits: results.filter((result) => result.decision === "block-reputation-credit").length,
    totalReputationDelta: results.reduce((sum, result) => sum + result.reputationDelta, 0),
  };

  return {
    generatedAt: new Date("2026-05-28T00:00:00Z").toISOString(),
    requirementMap: [
      "Reputation scoring: converts accepted bounty outcomes into transparent reputation deltas.",
      "Scientific bounty completions and challenge performance: gates points on acceptance, difficulty, result, settlement, and appeals.",
      "Contributor credits: allocates credit by team share and blocks invalid or duplicate split attribution.",
      "Badges and leaderboards: blocks final badge and leaderboard impact when reputation evidence is provisional or unsafe.",
      "Project timelines and citation pages: requires immutable deliverable, evaluation, settlement, and public-summary receipts.",
    ],
    summary,
    results,
  };
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Scientific Bounty Completion Reputation Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Completions reviewed: ${report.summary.completionsReviewed}`,
    `- Final credits: ${report.summary.finalCredits}`,
    `- Provisional credits: ${report.summary.provisionalCredits}`,
    `- Blocked credits: ${report.summary.blockedCredits}`,
    `- Total reputation delta: ${report.summary.totalReputationDelta}`,
    "",
    "## Requirement Map",
    "",
    ...report.requirementMap.map((item) => `- ${item}`),
    "",
    "## Findings",
    "",
  ];

  for (const result of report.results) {
    lines.push(`### ${result.researcher} - ${result.challenge}`);
    lines.push("");
    lines.push(`- Decision: ${result.decision}`);
    lines.push(`- Result: ${result.result}`);
    lines.push(`- Difficulty: ${result.difficulty}`);
    lines.push(`- Base points: ${result.basePoints}`);
    lines.push(`- Reputation delta: ${result.reputationDelta}`);
    for (const finding of result.findings) {
      lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
    lines.push("");
    lines.push("Actions:");
    for (const action of result.actions) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgReport(report) {
  const bars = [
    { label: "Final", value: report.summary.finalCredits, color: "#2f9e44" },
    { label: "Provisional", value: report.summary.provisionalCredits, color: "#1971c2" },
    { label: "Blocked", value: report.summary.blockedCredits, color: "#d6336c" },
  ];
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const rows = bars
    .map((bar, index) => {
      const y = 210 + index * 72;
      const barWidth = Math.round((bar.value / max) * 560);
      return [
        `<text x="80" y="${y + 28}" fill="#e9ecef" font-size="24">${escapeHtml(bar.label)}</text>`,
        `<rect x="260" y="${y}" width="${barWidth}" height="38" rx="4" fill="${bar.color}"/>`,
        `<text x="${280 + barWidth}" y="${y + 28}" fill="#e9ecef" font-size="22">${bar.value}</text>`,
      ].join("");
    })
    .join("");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520">',
    '<rect width="960" height="520" fill="#0b1020"/>',
    '<rect x="48" y="48" width="864" height="424" rx="8" fill="#151b2e" stroke="#334155"/>',
    '<text x="80" y="105" fill="#f8f9fa" font-size="32" font-family="Arial, sans-serif">Bounty Completion Reputation Guard</text>',
    `<text x="80" y="145" fill="#adb5bd" font-size="20" font-family="Arial, sans-serif">Total reputation delta: ${report.summary.totalReputationDelta}</text>`,
    rows,
    '<text x="80" y="454" fill="#adb5bd" font-size="18" font-family="Arial, sans-serif">Synthetic challenge-completion evidence only.</text>',
    "</svg>",
  ].join("");
}

module.exports = {
  reviewCompletion,
  reviewCompletions,
  renderMarkdownReport,
  renderSvgReport,
};
