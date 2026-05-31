const crypto = require("crypto");

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function sum(values) {
  return money(values.reduce((total, value) => total + Number(value || 0), 0));
}

function requiredCoverage(challenge) {
  return money(
    challenge.prizeAmount +
      challenge.platformReserve +
      challenge.honorableMentionBudget +
      challenge.cancellationRefundHold
  );
}

function milestoneTotal(challenge) {
  return money(sum((challenge.milestones || []).map((item) => item.percent)));
}

function validateMilestoneSchedule(challenge) {
  const blockers = [];
  const warnings = [];
  const milestones = challenge.milestones || [];

  const total = milestoneTotal(challenge);
  if (Math.abs(total - 1) > 0.0001) {
    blockers.push(`milestone percentages sum to ${total}, expected 1`);
  }

  let previousDueDay = 0;
  for (const milestone of milestones) {
    if (!milestone.id) {
      blockers.push("milestone is missing an id");
    }
    if (milestone.percent <= 0) {
      blockers.push(`milestone ${milestone.id || "unknown"} has non-positive percent`);
    }
    if (milestone.dueDay <= previousDueDay) {
      blockers.push(`milestone ${milestone.id || "unknown"} is not in due-day order`);
    }
    previousDueDay = milestone.dueDay;
  }

  const finalDue = milestones.length > 0 ? milestones[milestones.length - 1].dueDay : 0;
  if (finalDue < challenge.minSubmissionWindowDays) {
    warnings.push(
      `final milestone day ${finalDue} is shorter than submission window ${challenge.minSubmissionWindowDays}`
    );
  }

  return { blockers, warnings };
}

function validateTeamSplits(challenge) {
  const blockers = [];
  const warnings = [];
  for (const split of challenge.teamSplits || []) {
    const impliedMinimum = split.maxMembers * split.minMemberSharePercent;
    if (impliedMinimum > 100) {
      blockers.push(
        `team ${split.teamId} requires ${impliedMinimum}% minimum member shares`
      );
    } else if (split.minMemberSharePercent < 5) {
      warnings.push(`team ${split.teamId} permits very small member shares`);
    }
  }
  return { blockers, warnings };
}

function evaluateEscrowReadiness(challenge) {
  const blockers = [];
  const warnings = [];
  const evidence = [];
  const actions = [];

  const required = requiredCoverage(challenge);
  const deposit = money(challenge.sponsorDeposit);
  const deficit = money(Math.max(0, required - deposit));
  const surplus = money(Math.max(0, deposit - required));

  evidence.push(`required coverage ${required} ${challenge.currency}`);
  evidence.push(`sponsor deposit ${deposit} ${challenge.currency}`);

  if (deposit < required) {
    blockers.push(`deposit is short by ${deficit} ${challenge.currency}`);
    actions.push("hold challenge before submissions open");
    actions.push("request sponsor top-up or lower published awards");
  } else {
    evidence.push(`funding surplus ${surplus} ${challenge.currency}`);
  }

  if (challenge.refundLockedUntilDaysAfterOpen < 14) {
    blockers.push(
      `refund lock ${challenge.refundLockedUntilDaysAfterOpen} days is shorter than 14 day minimum`
    );
    actions.push("extend refund lock before solver work starts");
  }

  if (challenge.honorableMentionBudget > challenge.prizeAmount * 0.25) {
    warnings.push("honorable mention budget exceeds 25% of main prize");
  }

  const milestoneCheck = validateMilestoneSchedule(challenge);
  blockers.push(...milestoneCheck.blockers);
  warnings.push(...milestoneCheck.warnings);

  const teamCheck = validateTeamSplits(challenge);
  blockers.push(...teamCheck.blockers);
  warnings.push(...teamCheck.warnings);

  if (blockers.length === 0) {
    actions.push("publish funding-ready challenge");
    actions.push("freeze escrow coverage snapshot for reviewer audit");
  }

  const decision =
    blockers.length > 0
      ? "hold"
      : warnings.length > 0
        ? "publish_with_notice"
        : "publish";

  const result = {
    challengeId: challenge.id,
    title: challenge.title,
    sponsor: challenge.sponsor,
    currency: challenge.currency,
    decision,
    requiredCoverage: required,
    sponsorDeposit: deposit,
    surplus,
    deficit,
    evidence,
    blockers,
    warnings,
    actions: [...new Set(actions)],
  };

  return {
    ...result,
    auditDigest: digest(result),
  };
}

function evaluateEscrowReadinessBatch(challenges) {
  const decisions = challenges.map(evaluateEscrowReadiness);
  const summary = decisions.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.decision] += 1;
      acc.totalRequiredCoverage = money(
        acc.totalRequiredCoverage + item.requiredCoverage
      );
      acc.totalDeposits = money(acc.totalDeposits + item.sponsorDeposit);
      acc.totalDeficit = money(acc.totalDeficit + item.deficit);
      return acc;
    },
    {
      total: 0,
      publish: 0,
      publish_with_notice: 0,
      hold: 0,
      totalRequiredCoverage: 0,
      totalDeposits: 0,
      totalDeficit: 0,
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    summary,
    decisions,
  };
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Scientific Bounty Escrow Readiness Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Challenges checked: ${report.summary.total}`,
    `- Publish: ${report.summary.publish}`,
    `- Publish with notice: ${report.summary.publish_with_notice}`,
    `- Hold: ${report.summary.hold}`,
    `- Required coverage: ${report.summary.totalRequiredCoverage}`,
    `- Deposits: ${report.summary.totalDeposits}`,
    `- Deficit: ${report.summary.totalDeficit}`,
    "",
    "## Decisions",
    "",
  ];

  for (const item of report.decisions) {
    lines.push(`### ${item.challengeId} - ${item.decision}`);
    lines.push("");
    lines.push(`- Title: ${item.title}`);
    lines.push(`- Sponsor: ${item.sponsor}`);
    lines.push(`- Required coverage: ${item.requiredCoverage} ${item.currency}`);
    lines.push(`- Sponsor deposit: ${item.sponsorDeposit} ${item.currency}`);
    lines.push(`- Deficit: ${item.deficit} ${item.currency}`);
    lines.push(`- Audit digest: ${item.auditDigest}`);
    lines.push(`- Evidence: ${item.evidence.join("; ")}`);
    lines.push(`- Blockers: ${item.blockers.join("; ") || "none"}`);
    lines.push(`- Warnings: ${item.warnings.join("; ") || "none"}`);
    lines.push(`- Actions: ${item.actions.join("; ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgReport(report) {
  const rows = report.decisions
    .map((item, index) => {
      const y = 190 + index * 110;
      const color =
        item.decision === "publish"
          ? "#059669"
          : item.decision === "publish_with_notice"
            ? "#d97706"
            : "#dc2626";
      return `
        <g transform="translate(60 ${y})">
          <rect width="1080" height="86" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
          <circle cx="30" cy="43" r="11" fill="${color}"/>
          <text x="58" y="30" font-size="20" font-weight="700">${escapeXml(item.challengeId)} - ${escapeXml(item.decision)}</text>
          <text x="58" y="56" font-size="15" fill="#475569">${escapeXml(item.title.slice(0, 96))}</text>
          <text x="58" y="76" font-size="14" fill="#64748b">required ${item.requiredCoverage} / deposit ${item.sponsorDeposit} / deficit ${item.deficit}</text>
        </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="#ecfeff"/>
  <rect x="34" y="34" width="1132" height="652" rx="18" fill="white" stroke="#a5f3fc"/>
  <text x="60" y="92" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#111827">Scientific Bounty Escrow Readiness</text>
  <text x="60" y="130" font-family="Arial, sans-serif" font-size="20" fill="#475569">Publish ${report.summary.publish} / Notice ${report.summary.publish_with_notice} / Hold ${report.summary.hold}</text>
  <text x="60" y="160" font-family="Arial, sans-serif" font-size="18" fill="#64748b">Required ${report.summary.totalRequiredCoverage} - deposits ${report.summary.totalDeposits} - deficit ${report.summary.totalDeficit}</text>
  <g font-family="Arial, sans-serif">${rows}</g>
</svg>`;
}

module.exports = {
  evaluateEscrowReadiness,
  evaluateEscrowReadinessBatch,
  milestoneTotal,
  renderMarkdownReport,
  renderSvgReport,
  requiredCoverage,
};
