"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = Object.freeze({
  asOf: "2026-05-20",
  maxBundleDiscountBps: 2500,
  maxLineDiscountBps: 3500,
  minSspEvidenceScore: 0.75,
  requireRatableDates: true,
  requirePointInTimeEvidence: true,
});

function evaluateContractAllocations(input, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...policyOverrides };
  const evaluations = [];

  for (const contract of input.contracts || []) {
    const findings = [];
    const contractTotalCents = assertCents(contract.contractTotalCents, contract.id || "contract", "contractTotalCents");
    const obligations = Array.isArray(contract.obligations) ? contract.obligations : [];

    if (!contract.id) {
      findings.push(blocker("missing_contract_id", "Contract allocation requires a contract id"));
    }

    if (obligations.length === 0) {
      findings.push(blocker("missing_obligations", "Contract must include at least one performance obligation"));
    }

    const obligationInputs = obligations.map((obligation, index) => normalizeObligation(obligation, index, findings, policy));
    const totalSspCents = obligationInputs.reduce((sum, obligation) => sum + obligation.sspCents, 0);

    if (totalSspCents === 0 && obligations.length > 0) {
      findings.push(blocker("missing_total_ssp", "At least one obligation needs standalone selling price evidence"));
    }

    const bundleDiscountCents = Math.max(0, totalSspCents - contractTotalCents);
    const bundleDiscountBps = totalSspCents > 0 ? roundBps((bundleDiscountCents / totalSspCents) * 10000) : 0;
    if (bundleDiscountBps > policy.maxBundleDiscountBps) {
      findings.push(
        hold(
          "bundle_discount_cap",
          `Bundle discount ${bundleDiscountBps} bps exceeds limit ${policy.maxBundleDiscountBps} bps`
        )
      );
    }

    const allocations = totalSspCents > 0 ? allocateByRelativeSsp(obligationInputs, contractTotalCents, totalSspCents) : [];
    const obligationEvaluations = allocations.map((allocation) => {
      const obligationFindings = [...allocation.findings];
      const lineDiscountCents = Math.max(0, allocation.sspCents - allocation.allocatedRevenueCents);
      const lineDiscountBps = allocation.sspCents > 0 ? roundBps((lineDiscountCents / allocation.sspCents) * 10000) : 0;

      if (lineDiscountBps > policy.maxLineDiscountBps) {
        obligationFindings.push(
          hold(
            "line_discount_cap",
            `${allocation.id} discount ${lineDiscountBps} bps exceeds limit ${policy.maxLineDiscountBps} bps`
          )
        );
      }

      const recognition = recognizeObligation(allocation, policy, obligationFindings);
      const status = evaluationStatus(obligationFindings);

      return {
        id: allocation.id,
        type: allocation.type,
        recognitionPattern: allocation.recognitionPattern,
        status,
        sspCents: allocation.sspCents,
        allocatedRevenueCents: allocation.allocatedRevenueCents,
        lineDiscountCents,
        lineDiscountBps,
        earnedRevenueCents: recognition.earnedRevenueCents,
        deferredRevenueCents: recognition.deferredRevenueCents,
        schedule: recognition.schedule,
        findings: obligationFindings,
      };
    });

    for (const obligation of obligationEvaluations) {
      findings.push(...obligation.findings);
    }

    const status = evaluationStatus(findings);
    const evaluation = {
      contractId: contract.id || null,
      customerId: contract.customerId || null,
      status,
      currency: contract.currency || "USD",
      contractTotalCents,
      totalSspCents,
      bundleDiscountCents,
      bundleDiscountBps,
      obligationCount: obligationEvaluations.length,
      obligations: obligationEvaluations,
      findings: dedupeFindings(findings),
      recommendedActions: recommendedActions(status, findings),
    };

    evaluation.totals = summarizeObligations(obligationEvaluations);
    evaluations.push(evaluation);
  }

  const report = {
    asOf: policy.asOf,
    policy,
    contractCount: evaluations.length,
    totals: summarizeContracts(evaluations),
    evaluations,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function normalizeObligation(obligation, index, findings, policy) {
  const id = obligation.id || `obligation-${index + 1}`;
  const localFindings = [];
  const quantity = obligation.quantity === undefined ? 1 : obligation.quantity;
  const unitSspCents = obligation.unitSspCents === undefined ? 0 : obligation.unitSspCents;

  if (!obligation.id) {
    localFindings.push(blocker("missing_obligation_id", `Obligation ${index + 1} needs an id`));
  }

  if (!obligation.type) {
    localFindings.push(blocker("missing_obligation_type", `${id} needs a revenue stream type`));
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    localFindings.push(blocker("invalid_quantity", `${id} quantity must be a positive integer`));
  }

  if (!Number.isInteger(unitSspCents) || unitSspCents < 0) {
    localFindings.push(blocker("invalid_unit_ssp", `${id} unitSspCents must be a non-negative integer`));
  }

  const sspCents = Math.max(0, quantity) * Math.max(0, unitSspCents);
  if (sspCents === 0) {
    localFindings.push(blocker("missing_obligation_ssp", `${id} needs standalone selling price evidence`));
  }

  if (typeof obligation.sspEvidenceScore !== "number" || obligation.sspEvidenceScore < policy.minSspEvidenceScore) {
    localFindings.push(
      hold(
        "weak_ssp_evidence",
        `${id} SSP evidence score is below ${policy.minSspEvidenceScore}`
      )
    );
  }

  if (obligation.type === "material_right" && !obligation.expirationDate) {
    localFindings.push(hold("missing_material_right_expiry", `${id} needs an expiration date for the material right`));
  }

  findings.push(...localFindings);
  return {
    ...obligation,
    id,
    type: obligation.type || "unknown",
    quantity,
    unitSspCents,
    sspCents,
    recognitionPattern: obligation.recognitionPattern || defaultRecognitionPattern(obligation.type),
    findings: localFindings,
  };
}

function allocateByRelativeSsp(obligations, contractTotalCents, totalSspCents) {
  const allocations = obligations.map((obligation) => ({
    ...obligation,
    allocatedRevenueCents: Math.floor((obligation.sspCents / totalSspCents) * contractTotalCents),
  }));

  const allocatedTotal = allocations.reduce((sum, obligation) => sum + obligation.allocatedRevenueCents, 0);
  let residual = contractTotalCents - allocatedTotal;
  allocations.sort((a, b) => b.sspCents - a.sspCents || a.id.localeCompare(b.id));

  for (const obligation of allocations) {
    if (residual <= 0) break;
    obligation.allocatedRevenueCents += 1;
    residual -= 1;
  }

  return allocations.sort((a, b) => a.id.localeCompare(b.id));
}

function recognizeObligation(obligation, policy, findings) {
  if (obligation.recognitionPattern === "ratable") {
    if (policy.requireRatableDates && (!obligation.startDate || !obligation.endDate)) {
      findings.push(blocker("missing_ratable_dates", `${obligation.id} needs startDate and endDate`));
      return emptyRecognition(obligation.allocatedRevenueCents);
    }

    const schedule = buildMonthlySchedule(
      obligation.allocatedRevenueCents,
      obligation.startDate || policy.asOf,
      obligation.endDate || policy.asOf
    );
    const earnedRevenueCents = schedule
      .filter((entry) => entry.month <= monthKey(policy.asOf))
      .reduce((sum, entry) => sum + entry.revenueCents, 0);

    return {
      earnedRevenueCents,
      deferredRevenueCents: obligation.allocatedRevenueCents - earnedRevenueCents,
      schedule,
    };
  }

  if (obligation.recognitionPattern === "usage") {
    if (!Number.isInteger(obligation.estimatedUsageUnits) || obligation.estimatedUsageUnits <= 0) {
      findings.push(hold("missing_usage_estimate", `${obligation.id} needs estimated usage units for allocation review`));
      return emptyRecognition(obligation.allocatedRevenueCents);
    }

    const usedUnits = Math.max(0, obligation.usageToDateUnits || 0);
    const earnedRevenueCents = Math.min(
      obligation.allocatedRevenueCents,
      roundCents((usedUnits / obligation.estimatedUsageUnits) * obligation.allocatedRevenueCents)
    );

    return {
      earnedRevenueCents,
      deferredRevenueCents: obligation.allocatedRevenueCents - earnedRevenueCents,
      schedule: [],
    };
  }

  if (obligation.recognitionPattern === "point_in_time") {
    if (policy.requirePointInTimeEvidence && !obligation.deliveryEvidenceId) {
      findings.push(hold("missing_delivery_evidence", `${obligation.id} needs delivery evidence before recognition`));
    }
    const earnedRevenueCents = obligation.deliveryEvidenceId ? obligation.allocatedRevenueCents : 0;
    return {
      earnedRevenueCents,
      deferredRevenueCents: obligation.allocatedRevenueCents - earnedRevenueCents,
      schedule: [],
    };
  }

  if (obligation.recognitionPattern === "material_right") {
    const earnedRevenueCents = obligation.exercised ? obligation.allocatedRevenueCents : 0;
    return {
      earnedRevenueCents,
      deferredRevenueCents: obligation.allocatedRevenueCents - earnedRevenueCents,
      schedule: [],
    };
  }

  findings.push(hold("unknown_recognition_pattern", `${obligation.id} uses unsupported recognition pattern`));
  return emptyRecognition(obligation.allocatedRevenueCents);
}

function buildMonthlySchedule(totalCents, startDate, endDate) {
  const start = parseMonth(startDate);
  const end = parseMonth(endDate);
  const months = [];
  for (let cursor = start; cursor <= end; cursor = addMonth(cursor)) {
    months.push(formatMonth(cursor));
  }

  if (months.length === 0) {
    return [{ month: monthKey(startDate), revenueCents: totalCents }];
  }

  const base = Math.floor(totalCents / months.length);
  let residual = totalCents - base * months.length;
  return months.map((month) => {
    const revenueCents = base + (residual > 0 ? 1 : 0);
    residual -= residual > 0 ? 1 : 0;
    return { month, revenueCents };
  });
}

function parseMonth(dateString) {
  const [year, month] = String(dateString).split("-").map((value) => Number.parseInt(value, 10));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  return year * 12 + month - 1;
}

function addMonth(monthIndex) {
  return monthIndex + 1;
}

function formatMonth(monthIndex) {
  const year = Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthKey(dateString) {
  return formatMonth(parseMonth(dateString));
}

function defaultRecognitionPattern(type) {
  if (type === "subscription") return "ratable";
  if (type === "ai_compute") return "usage";
  if (type === "analytics_license") return "point_in_time";
  if (type === "material_right") return "material_right";
  return "unknown";
}

function summarizeObligations(obligations) {
  return obligations.reduce(
    (totals, obligation) => {
      totals.sspCents += obligation.sspCents;
      totals.allocatedRevenueCents += obligation.allocatedRevenueCents;
      totals.earnedRevenueCents += obligation.earnedRevenueCents;
      totals.deferredRevenueCents += obligation.deferredRevenueCents;
      if (obligation.status === "ready") totals.readyCount += 1;
      if (obligation.status === "held") totals.heldCount += 1;
      if (obligation.status === "blocked") totals.blockedCount += 1;
      return totals;
    },
    {
      readyCount: 0,
      heldCount: 0,
      blockedCount: 0,
      sspCents: 0,
      allocatedRevenueCents: 0,
      earnedRevenueCents: 0,
      deferredRevenueCents: 0,
    }
  );
}

function summarizeContracts(evaluations) {
  return evaluations.reduce(
    (totals, evaluation) => {
      if (evaluation.status === "ready") totals.readyCount += 1;
      if (evaluation.status === "held") totals.heldCount += 1;
      if (evaluation.status === "blocked") totals.blockedCount += 1;
      totals.contractTotalCents += evaluation.contractTotalCents;
      totals.totalSspCents += evaluation.totalSspCents;
      totals.allocatedRevenueCents += evaluation.totals.allocatedRevenueCents;
      totals.earnedRevenueCents += evaluation.totals.earnedRevenueCents;
      totals.deferredRevenueCents += evaluation.totals.deferredRevenueCents;
      return totals;
    },
    {
      readyCount: 0,
      heldCount: 0,
      blockedCount: 0,
      contractTotalCents: 0,
      totalSspCents: 0,
      allocatedRevenueCents: 0,
      earnedRevenueCents: 0,
      deferredRevenueCents: 0,
    }
  );
}

function evaluationStatus(findings) {
  if (findings.some((finding) => finding.severity === "blocker")) return "blocked";
  if (findings.some((finding) => finding.severity === "hold")) return "held";
  return "ready";
}

function recommendedActions(status, findings) {
  if (status === "ready") {
    return ["Approve allocation memo", "Post earned revenue and defer remaining obligation balances"];
  }

  const actions = new Set();
  for (const finding of findings) {
    if (finding.code === "missing_contract_id") actions.add("Attach a signed contract id before allocation review");
    if (finding.code === "missing_obligations") actions.add("List every subscription, compute, license, and material-right obligation");
    if (finding.code === "missing_obligation_ssp") actions.add("Attach standalone selling price evidence for each obligation");
    if (finding.code === "weak_ssp_evidence") actions.add("Refresh SSP support from approved price cards or comparable transactions");
    if (finding.code === "bundle_discount_cap") actions.add("Route excessive bundle discount to revenue operations approval");
    if (finding.code === "line_discount_cap") actions.add("Review obligation-level discount allocation before booking revenue");
    if (finding.code === "missing_ratable_dates") actions.add("Attach service period dates for ratable subscription revenue");
    if (finding.code === "missing_usage_estimate") actions.add("Attach compute usage estimate or defer recognition");
    if (finding.code === "missing_delivery_evidence") actions.add("Attach analytics delivery evidence before point-in-time recognition");
    if (finding.code === "missing_material_right_expiry") actions.add("Attach expiration date for renewal or discount material rights");
  }
  return Array.from(actions);
}

function emptyRecognition(allocatedRevenueCents) {
  return {
    earnedRevenueCents: 0,
    deferredRevenueCents: allocatedRevenueCents,
    schedule: [],
  };
}

function assertCents(value, id, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${id} ${field} must be a non-negative integer`);
  }
  return value;
}

function roundCents(value) {
  return Math.round(value);
}

function roundBps(value) {
  return Math.round(value);
}

function blocker(code, message) {
  return { severity: "blocker", code, message };
}

function hold(code, message) {
  return { severity: "hold", code, message };
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.severity}:${finding.code}:${finding.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function digest(report) {
  return crypto.createHash("sha256").update(JSON.stringify(report)).digest("hex");
}

module.exports = {
  DEFAULT_POLICY,
  evaluateContractAllocations,
};
