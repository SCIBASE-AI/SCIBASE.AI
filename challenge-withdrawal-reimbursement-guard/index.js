const crypto = require("node:crypto");

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function toDate(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hoursBetween(laterValue, earlierValue) {
  const later = toDate(laterValue);
  const earlier = toDate(earlierValue);
  if (!later || !earlier) {
    return null;
  }
  return Math.round((later.getTime() - earlier.getTime()) / (60 * 60 * 1000));
}

function daysBetween(laterValue, earlierValue) {
  const later = toDate(laterValue);
  const earlier = toDate(earlierValue);
  if (!later || !earlier) {
    return null;
  }
  return Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0;
}

function addFinding(findings, severity, code, message, refs, action) {
  findings.push({
    severity,
    code,
    message,
    refs: asArray(refs),
    action
  });
}

function normalizeString(value) {
  return String(value || "").trim().toLowerCase();
}

function noticeByTeam(challenge, teamId) {
  return asArray(challenge.communications && challenge.communications.solverNotices)
    .find((notice) => normalizeString(notice.teamId) === normalizeString(teamId));
}

function reimbursementByTeam(challenge, teamId) {
  return asArray(challenge.reimbursements)
    .find((payment) => normalizeString(payment.teamId) === normalizeString(teamId));
}

function solverStartedBeforeCancellation(solver, cancellation) {
  const startedAt = toDate(solver.startedAt || solver.acceptedAt);
  const requestedAt = toDate(cancellation && cancellation.requestedAt);
  if (!startedAt || !requestedAt) {
    return false;
  }
  return startedAt.getTime() <= requestedAt.getTime();
}

function evidenceMissing(record) {
  return !record || !record.evidenceHash || String(record.evidenceHash).length < 12;
}

function receiptMissing(record) {
  return !record || !record.receiptHash || String(record.receiptHash).length < 12;
}

function sumAmounts(records) {
  return roundMoney(asArray(records).reduce((total, record) => total + (Number(record.amountUsd) || 0), 0));
}

function calculateTeamRecommendation(challenge, solver, policy) {
  const bountyAmount = Number(challenge.bounty && challenge.bounty.amountUsd) || 0;
  const reimbursementCap = Math.min(
    Number(challenge.bounty && challenge.bounty.reimbursementCapUsd) || Number.POSITIVE_INFINITY,
    bountyAmount * Number(policy.maxReimbursementPercent || 0.35)
  );
  const documentedCosts = sumAmounts(asArray(solver.costClaims).filter((claim) => !evidenceMissing(claim)));
  const irreversibleCosts = sumAmounts(asArray(solver.costClaims).filter((claim) => claim.nonRefundable === true && !evidenceMissing(claim)));
  const progressPercent = Math.max(0, Math.min(100, Number(solver.milestoneProgressPercent) || 0));
  const milestoneCredit = roundMoney(bountyAmount * (progressPercent / 100) * Number(policy.milestoneCreditRate || 0.18));
  const rawRecommendation = roundMoney(irreversibleCosts + milestoneCredit);
  const recommendedUsd = roundMoney(Math.min(rawRecommendation, reimbursementCap));

  return {
    teamId: solver.teamId,
    documentedCostsUsd: documentedCosts,
    irreversibleCostsUsd: irreversibleCosts,
    milestoneCreditUsd: milestoneCredit,
    reimbursementCapUsd: roundMoney(reimbursementCap),
    recommendedUsd
  };
}

function evaluateChallenge(challenge, policy, reviewDate, findings) {
  const cancellation = challenge.cancellation || {};
  const bountyAmount = Number(challenge.bounty && challenge.bounty.amountUsd) || 0;
  const materialReduction = Number(cancellation.materialReductionPercent) || 0;
  const isWithdrawal = ["withdrawn", "cancelled", "canceled", "reduced"].includes(normalizeString(challenge.status))
    || ["withdrawal", "cancellation", "material_reduction"].includes(normalizeString(cancellation.type))
    || materialReduction >= Number(policy.materialReductionThresholdPercent || 25);
  const startedSolvers = asArray(challenge.solvers)
    .filter((solver) => solverStartedBeforeCancellation(solver, cancellation));
  const recommendations = [];

  if (!isWithdrawal) {
    return {
      id: challenge.id,
      status: challenge.status || "active",
      action: "not_a_withdrawal",
      affectedSolvers: 0,
      recommendedReimbursementUsd: 0,
      fundedShortfallUsd: 0,
      recommendations
    };
  }

  if (!cancellation.authorizedBy || challenge.sponsor && challenge.sponsor.cancellationAuthority !== true) {
    addFinding(
      findings,
      "critical",
      "CANCELLATION_AUTHORITY_MISSING",
      `${challenge.id || "Challenge"} does not show a sponsor-authorized cancellation decision.`,
      [challenge.id || "challenge"],
      "verify_sponsor_cancellation_authority_before_closeout"
    );
  }

  if (!cancellation.reason || String(cancellation.reason).length < 20) {
    addFinding(
      findings,
      "medium",
      "WITHDRAWAL_REASON_TOO_THIN",
      `${challenge.id || "Challenge"} has no reviewer-ready reason for withdrawal or material reduction.`,
      [challenge.id || "challenge"],
      "record_specific_withdrawal_reason_for_audit"
    );
  }

  if (startedSolvers.length === 0 && materialReduction >= Number(policy.materialReductionThresholdPercent || 25)) {
    addFinding(
      findings,
      "medium",
      "MATERIAL_REDUCTION_WITHOUT_SOLVER_SCAN",
      `${challenge.id || "Challenge"} is materially reduced but has no solver-start scan attached.`,
      [challenge.id || "challenge"],
      "attach_solver_start_scan_before_scope_reduction"
    );
  }

  const directNotices = startedSolvers.map((solver) => noticeByTeam(challenge, solver.teamId)).filter(Boolean);
  const earliestNotice = directNotices
    .map((notice) => notice.sentAt)
    .filter(Boolean)
    .sort()[0] || (challenge.communications && challenge.communications.sponsorNoticeAt);

  for (const solver of startedSolvers) {
    const refs = [challenge.id || "challenge", solver.teamId || "solver"];
    const notice = noticeByTeam(challenge, solver.teamId);

    if (!notice || !notice.sentAt) {
      addFinding(
        findings,
        "high",
        "SOLVER_WITHDRAWAL_NOTICE_MISSING",
        `${solver.teamId || "Solver"} has no direct withdrawal notice.`,
        refs,
        "send_equal_withdrawal_notice_to_all_started_solvers"
      );
    } else {
      const lag = hoursBetween(notice.sentAt, earliestNotice);
      if (lag !== null && lag > Number(policy.equalNoticeToleranceHours || 12)) {
        addFinding(
          findings,
          "high",
          "NOTICE_PARITY_GAP",
          `${solver.teamId || "Solver"} received withdrawal notice ${lag} hours after the first notified solver.`,
          refs,
          "restart_closeout_clock_after_equal_solver_notice"
        );
      }
      if (notice.includesAppealWindow !== true) {
        addFinding(
          findings,
          "medium",
          "APPEAL_WINDOW_NOT_IN_NOTICE",
          `${solver.teamId || "Solver"} notice omits the appeal window.`,
          refs,
          "include_appeal_deadline_in_solver_notice"
        );
      }
      if (notice.includesCostClaimLink !== true) {
        addFinding(
          findings,
          "high",
          "COST_CLAIM_PATH_NOT_IN_NOTICE",
          `${solver.teamId || "Solver"} notice omits the cost-claim path.`,
          refs,
          "include_solver_cost_claim_path_in_notice"
        );
      }
    }

    if (!solver.milestoneProgressPercent && asArray(solver.submittedMilestones).length === 0) {
      addFinding(
        findings,
        "medium",
        "MILESTONE_PROGRESS_EVIDENCE_MISSING",
        `${solver.teamId || "Solver"} has no milestone-progress evidence for reimbursement review.`,
        refs,
        "attach_milestone_progress_evidence_before_reimbursement_decision"
      );
    }

    for (const milestone of asArray(solver.submittedMilestones)) {
      if (evidenceMissing(milestone)) {
        addFinding(
          findings,
          "high",
          "MILESTONE_EVIDENCE_HASH_MISSING",
          `${solver.teamId || "Solver"} milestone ${milestone.id || "unknown"} lacks an evidence hash.`,
          refs,
          "hash_milestone_evidence_before_solver_cost_review"
        );
      }
    }

    for (const claim of asArray(solver.costClaims)) {
      if (evidenceMissing(claim)) {
        addFinding(
          findings,
          "high",
          "COST_CLAIM_EVIDENCE_MISSING",
          `${solver.teamId || "Solver"} cost claim ${claim.id || "unknown"} lacks evidence.`,
          refs,
          "attach_cost_claim_evidence_before_reimbursement"
        );
      }
      if (claim.nonRefundable === true && policy.irreversibleSpendRequiresReceipt !== false && receiptMissing(claim)) {
        addFinding(
          findings,
          "high",
          "NONREFUNDABLE_RECEIPT_MISSING",
          `${solver.teamId || "Solver"} non-refundable cost claim ${claim.id || "unknown"} lacks a receipt hash.`,
          refs,
          "attach_receipt_hash_for_nonrefundable_solver_spend"
        );
      }
    }

    if (!solver.ipReturn || !solver.ipReturn.returnedAt || !solver.ipReturn.dataDestroyedAt || !solver.ipReturn.attestationHash) {
      addFinding(
        findings,
        "medium",
        "IP_DATA_RETURN_ATTESTATION_MISSING",
        `${solver.teamId || "Solver"} has no complete IP return and data-destruction attestation.`,
        refs,
        "collect_ip_return_and_data_destruction_attestation"
      );
    }

    const recommendation = calculateTeamRecommendation(challenge, solver, policy);
    const recorded = reimbursementByTeam(challenge, solver.teamId);
    const recordedAmount = Number(recorded && recorded.amountUsd) || 0;
    recommendation.recordedUsd = roundMoney(recordedAmount);
    recommendation.shortfallUsd = roundMoney(Math.max(0, recommendation.recommendedUsd - recordedAmount));
    recommendation.action = recommendation.shortfallUsd > 0 ? "hold_and_reimburse_solver_costs" : "release_reimbursement_closeout";
    recommendations.push(recommendation);

    if (recommendation.recommendedUsd > 0 && !recorded) {
      addFinding(
        findings,
        "high",
        "REIMBURSEMENT_DECISION_MISSING",
        `${solver.teamId || "Solver"} has an eligible reimbursement recommendation but no recorded decision.`,
        refs,
        "record_solver_reimbursement_decision_before_challenge_closeout"
      );
    } else if (recommendation.shortfallUsd > 0) {
      addFinding(
        findings,
        "high",
        "REIMBURSEMENT_SHORTFALL",
        `${solver.teamId || "Solver"} reimbursement is short by $${recommendation.shortfallUsd.toFixed(2)}.`,
        refs,
        "fund_reimbursement_shortfall_or_escalate_dispute"
      );
    }
  }

  const holdDays = daysBetween(cancellation.disputeHoldUntil, cancellation.requestedAt);
  if (holdDays === null || holdDays < Number(policy.disputeHoldDays || 7)) {
    addFinding(
      findings,
      "critical",
      "DISPUTE_HOLD_WINDOW_TOO_SHORT",
      `${challenge.id || "Challenge"} has a dispute hold of ${holdDays === null ? "none" : `${holdDays} days`}.`,
      [challenge.id || "challenge"],
      "extend_dispute_hold_before_refund_or_closeout"
    );
  }

  if (!cancellation.appealDeadline) {
    addFinding(
      findings,
      "high",
      "APPEAL_DEADLINE_MISSING",
      `${challenge.id || "Challenge"} has no solver appeal deadline.`,
      [challenge.id || "challenge"],
      "set_solver_appeal_deadline_before_withdrawal_closeout"
    );
  }

  const totalRecommended = roundMoney(recommendations.reduce((total, item) => total + item.recommendedUsd, 0));
  const reserve = Number(challenge.sponsor && challenge.sponsor.reimbursementReserveUsd) || 0;
  const fundedShortfall = roundMoney(Math.max(0, totalRecommended - reserve));

  if (policy.requireSponsorFundedReserve !== false && fundedShortfall > 0) {
    addFinding(
      findings,
      "critical",
      "REIMBURSEMENT_RESERVE_SHORTFALL",
      `${challenge.id || "Challenge"} reserve is short by $${fundedShortfall.toFixed(2)} for solver reimbursement.`,
      [challenge.id || "challenge"],
      "fund_solver_reimbursement_reserve_before_releasing_sponsor_refund"
    );
  }

  const closeoutAction = recommendations.some((item) => item.shortfallUsd > 0) || fundedShortfall > 0
    ? "hold_for_solver_reimbursement"
    : "release_withdrawal_closeout";

  return {
    id: challenge.id,
    status: challenge.status || "withdrawn",
    bountyAmountUsd: roundMoney(bountyAmount),
    action: closeoutAction,
    affectedSolvers: startedSolvers.length,
    recommendedReimbursementUsd: totalRecommended,
    fundedShortfallUsd: fundedShortfall,
    recommendations
  };
}

function evaluateChallengeWithdrawal(packet) {
  const findings = [];
  const reviewDate = packet.reviewDate || new Date().toISOString().slice(0, 10);
  const policy = {
    equalNoticeToleranceHours: 12,
    disputeHoldDays: 7,
    maxReimbursementPercent: 0.35,
    materialReductionThresholdPercent: 25,
    milestoneCreditRate: 0.18,
    irreversibleSpendRequiresReceipt: true,
    requireSponsorFundedReserve: true,
    ...(packet.policy || {})
  };
  const challengeSummaries = asArray(packet.challenges).map((challenge) => (
    evaluateChallenge(challenge, policy, reviewDate, findings)
  ));
  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length;
  const highOrCriticalFindings = findings.filter((finding) => severityRank(finding.severity) >= severityRank("high")).length;
  const recommendedReimbursementUsd = roundMoney(challengeSummaries.reduce((total, item) => total + item.recommendedReimbursementUsd, 0));
  const fundedShortfallUsd = roundMoney(challengeSummaries.reduce((total, item) => total + item.fundedShortfallUsd, 0));
  const affectedSolvers = challengeSummaries.reduce((total, item) => total + item.affectedSolvers, 0);
  let decision = "release_withdrawal_closeout";

  if (criticalFindings > 0 || fundedShortfallUsd > 0) {
    decision = "escalate_withdrawal_dispute";
  } else if (highOrCriticalFindings > 0) {
    decision = "hold_for_reimbursement_review";
  }

  const auditSubject = {
    reviewDate,
    policy,
    challengeSummaries,
    findingCodes: findings.map((finding) => finding.code).sort()
  };

  return {
    summary: {
      decision,
      challengeCount: challengeSummaries.length,
      affectedSolvers,
      recommendedReimbursementUsd,
      fundedShortfallUsd,
      findingCount: findings.length,
      criticalFindings,
      highOrCriticalFindings,
      auditDigest: `sha256:${sha256(auditSubject)}`
    },
    challenges: challengeSummaries,
    findings: findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code))
  };
}

module.exports = {
  evaluateChallengeWithdrawal,
  sha256
};
