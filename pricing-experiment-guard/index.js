const crypto = require("node:crypto");

function evaluatePricingExperiment(experiment) {
  const normalized = normalizeExperiment(experiment);
  const findings = [
    ...findMissingHypothesisOrControl(normalized),
    ...findMarginFloorBreach(normalized),
    ...findEntitlementRegressions(normalized),
    ...findRollbackGaps(normalized),
    ...findBillingNoticeGaps(normalized),
    ...findAuditGaps(normalized)
  ];

  const severityCounts = countSeverities(findings);
  const summary = {
    experimentTitle: normalized.title,
    findingCount: findings.length,
    severityCounts,
    launchDecision: decideLaunch(severityCounts),
    financeReadiness: scoreFinanceReadiness(findings)
  };

  return {
    summary,
    findings,
    financePacket: buildFinancePacket(summary, findings)
  };
}

function normalizeExperiment(experiment) {
  if (!experiment || typeof experiment !== "object") {
    throw new TypeError("evaluatePricingExperiment expects an experiment object");
  }

  return {
    title: experiment.title || "Untitled pricing experiment",
    hypothesis: experiment.hypothesis || "",
    cohorts: Array.isArray(experiment.cohorts) ? experiment.cohorts : [],
    economics: experiment.economics || {},
    rollout: experiment.rollout || {},
    billing: experiment.billing || {},
    audit: experiment.audit || {}
  };
}

function findMissingHypothesisOrControl(experiment) {
  const evidence = [];
  if (!experiment.hypothesis.trim()) evidence.push("experiment hypothesis is missing");
  if (!experiment.cohorts.some((cohort) => Number(cohort.priceMultiplier) === 1)) {
    evidence.push("control cohort with unchanged pricing is missing");
  }

  if (evidence.length === 0) return [];

  return [
    finding({
      type: "missing_hypothesis_or_control",
      severity: "critical",
      title: "Pricing experiment lacks a measurable hypothesis or control cohort",
      evidence,
      remediation:
        "Define the business hypothesis and add a control cohort before exposing customers to changed prices."
    })
  ];
}

function findMarginFloorBreach(experiment) {
  const floor = Number(experiment.economics.grossMarginFloorPercent);
  const projected = Number(experiment.economics.projectedGrossMarginPercent);

  if (!Number.isFinite(floor) || !Number.isFinite(projected) || projected >= floor) {
    return [];
  }

  return [
    finding({
      type: "margin_floor_breach",
      severity: "high",
      title: "Projected gross margin falls below the approved floor",
      evidence: [`projected margin ${projected}% is below the ${floor}% floor`],
      remediation:
        "Reprice the cohort, reduce compute cost, or lower exposure until projected gross margin clears the finance floor."
    })
  ];
}

function findEntitlementRegressions(experiment) {
  const regressions = [];

  for (const cohort of experiment.cohorts) {
    const removed = Array.isArray(cohort.entitlementsRemoved) ? cohort.entitlementsRemoved : [];
    if (removed.length > 0 && !cohort.grandfathering) {
      regressions.push(
        `${cohort.name || "unnamed cohort"} removes ${removed.join(", ")} without grandfathering`
      );
    }
  }

  if (regressions.length === 0) return [];

  return [
    finding({
      type: "entitlement_regression",
      severity: "high",
      title: "Pricing change removes customer entitlements without protection",
      evidence: regressions,
      remediation:
        "Grandfather existing customers, add customer-facing entitlement notices, or remove entitlement regressions from the experiment."
    })
  ];
}

function findRollbackGaps(experiment) {
  const evidence = [];
  const maxExposure = Number(experiment.rollout.maxExposurePercent);

  for (const cohort of experiment.cohorts) {
    const exposure = Number(cohort.exposurePercent);
    const changesPrice = Number(cohort.priceMultiplier) !== 1;
    if (changesPrice && Number.isFinite(exposure) && Number.isFinite(maxExposure) && exposure > maxExposure) {
      evidence.push(
        `${cohort.name || "unnamed cohort"} exposure ${exposure}% exceeds max ${maxExposure}%`
      );
    }
  }

  if (!experiment.rollout.rollbackMetric) evidence.push("rollback metric is missing");
  if (!experiment.rollout.rollbackThreshold) evidence.push("rollback threshold is missing");
  if (!experiment.rollout.owner) evidence.push("rollout owner is missing");

  if (evidence.length === 0) return [];

  return [
    finding({
      type: "rollback_gap",
      severity: "medium",
      title: "Rollout controls are not ready for a pricing experiment",
      evidence,
      remediation:
        "Set cohort exposure limits, rollback metrics, rollback thresholds, and a named owner before launch."
    })
  ];
}

function findBillingNoticeGaps(experiment) {
  const evidence = [];
  const noticeDays = Number(experiment.billing.customerNoticeDays);

  if (!experiment.billing.invoiceCopyReviewed) evidence.push("invoice copy has not been reviewed");
  if (!Number.isFinite(noticeDays) || noticeDays < 14) {
    evidence.push(`customer notice window is ${Number.isFinite(noticeDays) ? noticeDays : "missing"} days`);
  }
  if (!experiment.billing.taxTreatmentReviewed) evidence.push("tax treatment review is missing");

  if (evidence.length === 0) return [];

  return [
    finding({
      type: "billing_notice_gap",
      severity: "medium",
      title: "Billing and customer notice controls are incomplete",
      evidence,
      remediation:
        "Review invoice copy, confirm tax treatment, and provide an adequate customer notice window before billing changes go live."
    })
  ];
}

function findAuditGaps(experiment) {
  const evidence = [];
  const approvals = Array.isArray(experiment.audit.approvalRecords)
    ? experiment.audit.approvalRecords
    : [];

  if (approvals.length === 0) evidence.push("finance/legal approval records are missing");
  if (!experiment.audit.revenueRecognitionNotes) {
    evidence.push("revenue recognition notes are missing");
  }

  if (evidence.length === 0) return [];

  return [
    finding({
      type: "audit_packet_gap",
      severity: "medium",
      title: "Finance audit packet is incomplete",
      evidence,
      remediation:
        "Attach finance/legal approvals and revenue-recognition notes before the experiment is approved."
    })
  ];
}

function buildFinancePacket(summary, findings) {
  if (findings.length === 0) {
    return {
      requiredActions: ["Proceed with monitored launch."],
      ownerQuestions: [
        "Are finance and support teams ready to watch refund, churn, and gross-margin triggers?"
      ],
      auditSummary: `${summary.experimentTitle} is ready for monitored launch.`
    };
  }

  return {
    requiredActions: findings.map((finding) => finding.remediation),
    ownerQuestions: [
      "Is there a control cohort and a measurable revenue hypothesis?",
      "Can finance confirm the projected margin stays above the approved floor?",
      "Can billing roll back invoices and entitlements without customer harm?"
    ],
    auditSummary: `${summary.experimentTitle} needs ${findings.length} remediation action(s) before launch.`
  };
}

function finding(input) {
  return {
    id: `${input.type}-${hash(input.evidence.join("|")).slice(0, 8)}`,
    type: input.type,
    severity: input.severity,
    title: input.title,
    evidence: input.evidence,
    remediation: input.remediation
  };
}

function countSeverities(findings) {
  const counts = { critical: 0, high: 0, medium: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

function decideLaunch(counts) {
  if (counts.critical > 0 || counts.high > 0) return "block";
  if (counts.medium > 0) return "needs-remediation";
  return "approve";
}

function scoreFinanceReadiness(findings) {
  if (findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) {
    return "low";
  }
  if (findings.length > 0) return "medium";
  return "high";
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

module.exports = {
  evaluatePricingExperiment
};
