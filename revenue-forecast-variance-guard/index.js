const crypto = require("node:crypto");

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(value))
    .digest("hex")
    .slice(0, 16);
}

function daysUntil(dateString, asOfDate) {
  const target = new Date(`${dateString}T00:00:00Z`);
  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  return Math.ceil((target.getTime() - asOf.getTime()) / 86400000);
}

function evaluateSubscriptions(subscriptions, policy) {
  return subscriptions.map((account) => {
    const forecastMrr = money(account.forecastMrr);
    const actualMrr = money(account.actualMrr);
    const variance = money(actualMrr - forecastMrr);
    const variancePct = pct(variance, forecastMrr);
    const seatUtilization = pct(account.activeSeats, account.contractedSeats);
    const renewalDays = daysUntil(account.renewalDate, policy.asOfDate);
    const findings = [];

    if (variancePct <= -policy.mrrVarianceWarnPct) {
      findings.push({
        severity: "high",
        code: "subscription_forecast_shortfall",
        message: `${account.accountId} is ${Math.abs(variancePct)}% below forecast MRR.`,
      });
    }

    if (seatUtilization < policy.minimumSeatUtilizationPct) {
      findings.push({
        severity: "medium",
        code: "seat_underutilization",
        message: `${account.accountId} seat utilization is ${seatUtilization}%.`,
      });
    }

    if (renewalDays >= 0 && renewalDays <= policy.renewalWindowDays) {
      findings.push({
        severity: account.renewalConfidence < 0.7 ? "high" : "medium",
        code: "renewal_forecast_review",
        message: `${account.accountId} renewal is ${renewalDays} days away with ${pct(account.renewalConfidence, 1)}% confidence.`,
      });
    }

    return {
      accountId: account.accountId,
      plan: account.plan,
      forecastMrr,
      actualMrr,
      variance,
      variancePct,
      seatUtilization,
      renewalDays,
      renewalConfidence: account.renewalConfidence,
      findings,
    };
  });
}

function evaluateComputeUsage(workloads, policy) {
  return workloads.map((workload) => {
    const forecastRevenue = money(workload.forecastRevenue);
    const actualRevenue = money(workload.actualRevenue);
    const forecastCost = money(workload.forecastCost);
    const actualCost = money(workload.actualCost);
    const costVariancePct = pct(actualCost - forecastCost, forecastCost);
    const grossMarginPct = pct(actualRevenue - actualCost, actualRevenue);
    const quotaBurnPct = pct(workload.actualUnits, workload.includedUnits);
    const findings = [];

    if (costVariancePct >= policy.computeCostVarianceWarnPct) {
      findings.push({
        severity: "high",
        code: "compute_cost_overrun",
        message: `${workload.accountId} compute cost is ${costVariancePct}% above forecast.`,
      });
    }

    if (grossMarginPct < policy.computeGrossMarginFloorPct) {
      findings.push({
        severity: "critical",
        code: "compute_margin_floor_breach",
        message: `${workload.accountId} gross margin is ${grossMarginPct}%, below ${policy.computeGrossMarginFloorPct}%.`,
      });
    }

    if (quotaBurnPct >= policy.quotaBurnWarnPct) {
      findings.push({
        severity: "medium",
        code: "quota_burn_warning",
        message: `${workload.accountId} has burned ${quotaBurnPct}% of included compute units.`,
      });
    }

    return {
      accountId: workload.accountId,
      workload: workload.workload,
      forecastRevenue,
      actualRevenue,
      forecastCost,
      actualCost,
      grossMarginPct,
      quotaBurnPct,
      findings,
    };
  });
}

function evaluateLicensingDeals(deals, policy) {
  return deals.map((deal) => {
    const weightedForecast = money(deal.forecastRevenue * deal.probability);
    const recognizedRevenue = deal.status === "booked" ? money(deal.actualRevenue) : 0;
    const daysPastTarget = Math.max(0, -daysUntil(deal.targetCloseDate, policy.asOfDate));
    const findings = [];

    if (deal.status !== "booked" && daysPastTarget > policy.pipelineSlipGraceDays) {
      findings.push({
        severity: "high",
        code: "licensing_pipeline_slip",
        message: `${deal.dealId} is ${daysPastTarget} days past target close.`,
      });
    }

    if (!deal.aggregationPassed || deal.minimumCohortSize < policy.minimumLicensingCohortSize) {
      findings.push({
        severity: "critical",
        code: "licensing_privacy_hold",
        message: `${deal.dealId} must stay out of forecast until privacy and aggregation gates pass.`,
      });
    }

    return {
      dealId: deal.dealId,
      buyerSegment: deal.buyerSegment,
      weightedForecast,
      recognizedRevenue,
      status: deal.status,
      targetCloseDate: deal.targetCloseDate,
      daysPastTarget,
      findings,
    };
  });
}

function severityRank(severity) {
  return { critical: 3, high: 2, medium: 1, low: 0 }[severity] || 0;
}

function actionForFinding(finding, owner) {
  const dueInDays = finding.severity === "critical" ? 1 : finding.severity === "high" ? 3 : 7;
  return {
    owner,
    code: finding.code,
    severity: finding.severity,
    dueInDays,
    action: finding.message,
  };
}

function buildRevenueForecastReport(input) {
  const policy = input.policy;
  const subscriptions = evaluateSubscriptions(input.subscriptions, policy);
  const compute = evaluateComputeUsage(input.computeUsage, policy);
  const licensing = evaluateLicensingDeals(input.licensingDeals, policy);

  const findings = [
    ...subscriptions.flatMap((item) => item.findings.map((finding) => ({ ...finding, owner: item.accountId }))),
    ...compute.flatMap((item) => item.findings.map((finding) => ({ ...finding, owner: item.accountId }))),
    ...licensing.flatMap((item) => item.findings.map((finding) => ({ ...finding, owner: item.dealId }))),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.owner.localeCompare(b.owner));

  const forecastRevenue = money(
    subscriptions.reduce((sum, item) => sum + item.forecastMrr, 0) +
      compute.reduce((sum, item) => sum + item.forecastRevenue, 0) +
      licensing.reduce((sum, item) => sum + item.weightedForecast, 0),
  );

  const currentRevenue = money(
    subscriptions.reduce((sum, item) => sum + item.actualMrr, 0) +
      compute.reduce((sum, item) => sum + item.actualRevenue, 0) +
      licensing.reduce((sum, item) => sum + item.recognizedRevenue, 0),
  );

  const variance = money(currentRevenue - forecastRevenue);
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const status = criticalCount ? "blocked" : highCount ? "needs-review" : "ready";

  const actions = findings.map((finding) => actionForFinding(finding, finding.owner));
  const report = {
    reportId: input.reportId,
    asOfDate: policy.asOfDate,
    status,
    forecastRevenue,
    currentRevenue,
    variance,
    variancePct: pct(variance, forecastRevenue),
    criticalCount,
    highCount,
    subscriptions,
    compute,
    licensing,
    actions,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

module.exports = {
  buildRevenueForecastReport,
  digest,
  evaluateComputeUsage,
  evaluateLicensingDeals,
  evaluateSubscriptions,
};
