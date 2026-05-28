"use strict";

const crypto = require("crypto");

const WEIGHTS = {
  critical: 28,
  high: 18,
  medium: 10,
  low: 5,
};

function centsToUsd(cents) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || "medium",
    recommendation: recommendationFor(finding.code),
    ...finding,
  });
}

function recommendationFor(code) {
  const recommendations = {
    ESCROW_UNDERFUNDED: "Block launch until escrow equals the advertised prize and reserve.",
    MILESTONE_TOTAL_MISMATCH: "Reconcile milestone payouts with the published prize schedule.",
    MILESTONE_ACCEPTANCE_GAP: "Add objective acceptance criteria and due dates for every milestone.",
    SPLIT_TOTAL_INVALID: "Require signed team allocation splits that total exactly 100%.",
    PAYEE_PAYOUT_NOT_READY: "Collect payout readiness attestations before sponsor acceptance.",
    INSTITUTION_TAX_FORM_MISSING: "Collect institution tax and routing metadata before routing funds.",
    PREPAYMENT_IP_TRANSFER: "Move IP transfer to a paid or escrow-released state.",
    UNBUDGETED_HONORABLE_MENTION: "Reserve funds for honorable mentions or remove the promise.",
    WEAK_ARBITRATION_PANEL: "Require at least two independent reviewers for contested awards.",
    NDA_TEMPLATE_MISSING: "Attach an NDA template before accepting private submissions.",
  };
  return recommendations[code] || "Route this item for platform operations review.";
}

function analyzeChallengePayout(challenge) {
  const findings = [];
  const milestones = challenge.milestones || [];
  const teamSplits = challenge.teamSplits || [];
  const prizeCents = challenge.prizeCents || 0;
  const reserveCents = challenge.reserveCents || 0;
  const requiredEscrowCents = prizeCents + reserveCents;
  const milestoneTotalCents = milestones.reduce((sum, milestone) => sum + (milestone.amountCents || 0), 0);
  const splitTotal = teamSplits.reduce((sum, split) => sum + (split.percent || 0), 0);

  if ((challenge.escrowedCents || 0) < requiredEscrowCents) {
    addFinding(findings, {
      code: "ESCROW_UNDERFUNDED",
      severity: "critical",
      message: `Escrow ${centsToUsd(challenge.escrowedCents || 0)} is below required ${centsToUsd(requiredEscrowCents)}.`,
      evidence: { escrowedCents: challenge.escrowedCents || 0, requiredEscrowCents },
    });
  }

  if (milestoneTotalCents !== prizeCents) {
    addFinding(findings, {
      code: "MILESTONE_TOTAL_MISMATCH",
      severity: "high",
      message: `Milestones total ${centsToUsd(milestoneTotalCents)} but prize is ${centsToUsd(prizeCents)}.`,
      evidence: { milestoneTotalCents, prizeCents },
    });
  }

  for (const milestone of milestones) {
    if (!milestone.acceptanceCriteria || !milestone.dueDate) {
      addFinding(findings, {
        code: "MILESTONE_ACCEPTANCE_GAP",
        severity: "medium",
        message: `Milestone ${milestone.id} is missing ${!milestone.acceptanceCriteria ? "acceptance criteria" : "a due date"}.`,
        evidence: milestone,
      });
    }
  }

  if (Math.round(splitTotal * 100) !== 10000) {
    addFinding(findings, {
      code: "SPLIT_TOTAL_INVALID",
      severity: "critical",
      message: `Team split totals ${splitTotal}% instead of 100%.`,
      evidence: { splitTotal, teamSplits },
    });
  }

  for (const split of teamSplits) {
    if (split.payoutStatus !== "ready") {
      addFinding(findings, {
        code: "PAYEE_PAYOUT_NOT_READY",
        severity: "high",
        message: `${split.payeeId} is not ready for payout routing.`,
        evidence: split,
      });
    }
    if (split.payeeType === "institution" && !split.taxFormOnFile) {
      addFinding(findings, {
        code: "INSTITUTION_TAX_FORM_MISSING",
        severity: "high",
        message: `${split.payeeId} is an institution without a tax form on file.`,
        evidence: split,
      });
    }
  }

  if (challenge.ipTransferTrigger === "on-submission") {
    addFinding(findings, {
      code: "PREPAYMENT_IP_TRANSFER",
      severity: "critical",
      message: "Challenge transfers solver IP before payment release.",
      evidence: { ipTransferTrigger: challenge.ipTransferTrigger },
    });
  }

  const honorableMentionCents = (challenge.honorableMentions || []).reduce(
    (sum, mention) => sum + (mention.count || 0) * (mention.amountCents || 0),
    0
  );
  if (honorableMentionCents > 0 && !challenge.honorableMentionReserveCents) {
    addFinding(findings, {
      code: "UNBUDGETED_HONORABLE_MENTION",
      severity: "medium",
      message: `Honorable mentions promise ${centsToUsd(honorableMentionCents)} without a reserve.`,
      evidence: { honorableMentionCents },
    });
  }

  if ((challenge.arbitration?.independentReviewers || 0) < 2) {
    addFinding(findings, {
      code: "WEAK_ARBITRATION_PANEL",
      severity: "medium",
      message: "Contested awards have fewer than two independent reviewers.",
      evidence: challenge.arbitration,
    });
  }

  if (challenge.visibility === "private" && challenge.ndaRequired && !challenge.ndaTemplateId) {
    addFinding(findings, {
      code: "NDA_TEMPLATE_MISSING",
      severity: "high",
      message: "Private challenge requires NDA support but has no template attached.",
      evidence: { visibility: challenge.visibility, ndaRequired: challenge.ndaRequired },
    });
  }

  const riskScore = Math.min(100, findings.reduce((score, finding) => score + WEIGHTS[finding.severity], 0));
  const decision =
    riskScore >= 70 ? "hold-award-routing" : riskScore >= 35 ? "repair-before-launch" : "ready-for-awards";
  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify(findings.map((finding) => [finding.code, finding.severity, finding.message]).sort()))
    .digest("hex")
    .slice(0, 16);

  return {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      sponsor: challenge.sponsor,
    },
    summary: {
      decision,
      riskScore,
      auditDigest: digest,
      findings: findings.length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
      prizeCents,
      escrowedCents: challenge.escrowedCents || 0,
      requiredEscrowCents,
      milestoneTotalCents,
      splitTotal,
    },
    findings,
    releaseChecklist: [
      { item: "Sponsor escrow covers prize, reserve, and promised mentions.", passed: (challenge.escrowedCents || 0) >= requiredEscrowCents && honorableMentionCents === 0 },
      { item: "Milestone payout schedule reconciles to the published prize.", passed: milestoneTotalCents === prizeCents },
      { item: "Solver team split agreement totals 100%.", passed: Math.round(splitTotal * 100) === 10000 },
      { item: "All payees are payout-ready before sponsor acceptance.", passed: teamSplits.every((split) => split.payoutStatus === "ready" && (split.payeeType !== "institution" || split.taxFormOnFile)) },
      { item: "IP transfer is gated on payment release.", passed: challenge.ipTransferTrigger !== "on-submission" },
    ],
  };
}

function renderMarkdownReport(report) {
  const lines = [
    `# Milestone Payout Routing Audit: ${report.challenge.title}`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Risk score: ${report.summary.riskScore}`,
    `- Prize: ${centsToUsd(report.summary.prizeCents)}`,
    `- Escrowed: ${centsToUsd(report.summary.escrowedCents)}`,
    `- Required escrow: ${centsToUsd(report.summary.requiredEscrowCents)}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.code}`);
    lines.push(`  - ${finding.message}`);
    lines.push(`  - Recommendation: ${finding.recommendation}`);
  }

  lines.push("", "## Release Checklist", "");
  for (const item of report.releaseChecklist) {
    lines.push(`- [${item.passed ? "x" : "!"}] ${item.item}`);
  }
  return `${lines.join("\n")}\n`;
}

module.exports = {
  analyzeChallengePayout,
  renderMarkdownReport,
  centsToUsd,
};
