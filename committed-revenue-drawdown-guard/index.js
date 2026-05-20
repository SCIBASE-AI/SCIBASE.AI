"use strict";

const crypto = require("crypto");

const STREAMS = ["subscription", "compute", "analytics"];

function toMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100) / 100;
}

function daysBetween(start, end) {
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const endMs = new Date(`${end}T00:00:00Z`).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    throw new Error(`Invalid contract window: ${start} -> ${end}`);
  }
  return Math.max(1, Math.ceil((endMs - startMs) / 86400000) + 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(toMoney(value));
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function auditDigest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function summarizeStream(contract, stream, elapsedRatio) {
  const committed = toMoney(contract.commitments[stream] || 0);
  const consumed = toMoney(
    contract.usage
      .filter((entry) => entry.stream === stream)
      .reduce((sum, entry) => sum + Number(entry.amountUsd || 0), 0),
  );
  const expectedToDate = toMoney(committed * elapsedRatio);
  const projectedFinal = elapsedRatio > 0 ? toMoney(consumed / elapsedRatio) : consumed;
  const remaining = toMoney(committed - consumed);
  const utilization = committed > 0 ? consumed / committed : 0;
  const paceRatio = expectedToDate > 0 ? consumed / expectedToDate : 1;
  const projectedVariance = toMoney(projectedFinal - committed);

  let status = "on-track";
  if (committed === 0 && consumed > 0) {
    status = "uncontracted-usage";
  } else if (projectedFinal > committed * 1.12) {
    status = "overage-risk";
  } else if (paceRatio < 0.72 && remaining > committed * 0.25) {
    status = "under-consumption-risk";
  } else if (utilization > 0.92 && projectedFinal > committed) {
    status = "expansion-ready";
  }

  return {
    stream,
    committed,
    consumed,
    remaining,
    expectedToDate,
    projectedFinal,
    projectedVariance,
    utilization: Number(utilization.toFixed(4)),
    paceRatio: Number(paceRatio.toFixed(4)),
    status,
  };
}

function creditRisks(contract, asOf) {
  return (contract.creditPools || [])
    .map((pool) => {
      const expiresInDays = daysBetween(asOf, pool.expiresOn);
      const remainingUsd = toMoney(pool.remainingUsd || 0);
      const flagged =
        remainingUsd > 0 &&
        expiresInDays <= (contract.thresholds.creditExpirationWindowDays || 45);
      return {
        id: pool.id,
        stream: pool.stream,
        remainingUsd,
        expiresOn: pool.expiresOn,
        expiresInDays,
        flagged,
      };
    })
    .filter((pool) => pool.flagged);
}

function marginRisks(contract) {
  const floor = contract.thresholds.marginFloorPercent || 35;
  return (contract.usage || [])
    .filter((entry) => Number(entry.grossMarginPercent) < floor)
    .map((entry) => ({
      usageId: entry.id,
      stream: entry.stream,
      amountUsd: toMoney(entry.amountUsd),
      grossMarginPercent: Number(entry.grossMarginPercent),
      floorPercent: floor,
      description: entry.description,
    }));
}

function buildActions(contract, streamSummaries, expiringCredits, lowMarginUsage) {
  const actions = [];

  for (const summary of streamSummaries) {
    if (summary.status === "under-consumption-risk") {
      actions.push({
        owner: "customer-success",
        priority: "high",
        code: `${summary.stream}-drawdown-plan`,
        action: `Create a ${summary.stream} adoption plan for ${contract.customer}.`,
        evidence: `${formatUsd(summary.remaining)} remains against the committed ${summary.stream} pool.`,
      });
    }
    if (summary.status === "overage-risk") {
      actions.push({
        owner: "finance",
        priority: "high",
        code: `${summary.stream}-amendment-review`,
        action: `Prepare a contract amendment for projected ${summary.stream} overage.`,
        evidence: `Projected final usage is ${formatUsd(summary.projectedFinal)} against ${formatUsd(
          summary.committed,
        )} committed.`,
      });
    }
    if (summary.status === "expansion-ready") {
      actions.push({
        owner: "account-executive",
        priority: "medium",
        code: `${summary.stream}-expansion-motion`,
        action: `Open an expansion conversation for ${summary.stream}.`,
        evidence: `${Math.round(summary.utilization * 100)}% of the committed pool is already consumed.`,
      });
    }
  }

  for (const pool of expiringCredits) {
    actions.push({
      owner: "customer-success",
      priority: "medium",
      code: "credit-expiration-drawdown",
      action: `Schedule usage before ${pool.id} expires.`,
      evidence: `${formatUsd(pool.remainingUsd)} in ${pool.stream} credits expires in ${pool.expiresInDays} days.`,
    });
  }

  for (const usage of lowMarginUsage) {
    actions.push({
      owner: "finance-ops",
      priority: "medium",
      code: "margin-floor-review",
      action: `Review margin floor for ${usage.usageId}.`,
      evidence: `${usage.grossMarginPercent}% gross margin is below the ${usage.floorPercent}% floor.`,
    });
  }

  return actions.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority] || a.code.localeCompare(b.code);
  });
}

function evaluateContract(contract, options = {}) {
  const asOf = options.asOf || contract.asOf || new Date().toISOString().slice(0, 10);
  const thresholds = {
    marginFloorPercent: 35,
    creditExpirationWindowDays: 45,
    ...(contract.thresholds || {}),
  };
  const normalized = { ...contract, thresholds };
  const totalDays = daysBetween(contract.periodStart, contract.periodEnd);
  const elapsedDays = clamp(daysBetween(contract.periodStart, asOf), 1, totalDays);
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const elapsedRatio = clamp(elapsedDays / totalDays, 0.01, 1);
  const streamSummaries = STREAMS.map((stream) => summarizeStream(normalized, stream, elapsedRatio));
  const committedTotal = toMoney(streamSummaries.reduce((sum, item) => sum + item.committed, 0));
  const consumedTotal = toMoney(streamSummaries.reduce((sum, item) => sum + item.consumed, 0));
  const projectedTotal = toMoney(streamSummaries.reduce((sum, item) => sum + item.projectedFinal, 0));
  const expiringCredits = creditRisks(normalized, asOf);
  const lowMarginUsage = marginRisks(normalized);
  const actions = buildActions(normalized, streamSummaries, expiringCredits, lowMarginUsage);
  const hardRisks = actions.filter((action) => action.priority === "high").length;
  const mediumRisks = actions.filter((action) => action.priority === "medium").length;
  const revenueCertaintyScore = clamp(100 - hardRisks * 18 - mediumRisks * 7, 0, 100);

  let recommendation = "hold-current-contract";
  if (streamSummaries.some((stream) => stream.status === "overage-risk")) {
    recommendation = "prepare-paid-amendment";
  } else if (streamSummaries.some((stream) => stream.status === "under-consumption-risk")) {
    recommendation = "protect-renewal-with-drawdown-plan";
  } else if (streamSummaries.some((stream) => stream.status === "expansion-ready")) {
    recommendation = "start-expansion-motion";
  }

  const status =
    hardRisks > 0 ? "amendment-review-needed" : mediumRisks > 0 ? "monitor" : "ready";

  const result = {
    contractId: contract.id,
    customer: contract.customer,
    asOf,
    period: {
      start: contract.periodStart,
      end: contract.periodEnd,
      totalDays,
      elapsedDays,
      remainingDays,
      elapsedRatio: Number(elapsedRatio.toFixed(4)),
    },
    totals: {
      committed: committedTotal,
      consumed: consumedTotal,
      remaining: toMoney(committedTotal - consumedTotal),
      projectedFinal: projectedTotal,
      projectedVariance: toMoney(projectedTotal - committedTotal),
    },
    streamSummaries,
    expiringCredits,
    lowMarginUsage,
    actions,
    revenueCertaintyScore,
    recommendation,
    status,
  };

  return {
    ...result,
    auditDigest: auditDigest({
      contractId: result.contractId,
      asOf: result.asOf,
      totals: result.totals,
      streamSummaries: result.streamSummaries,
      actions: result.actions.map((action) => action.code),
      recommendation: result.recommendation,
    }),
  };
}

function evaluatePortfolio(contracts, options = {}) {
  const contractsEvaluated = contracts.map((contract) => evaluateContract(contract, options));
  const committed = toMoney(contractsEvaluated.reduce((sum, contract) => sum + contract.totals.committed, 0));
  const consumed = toMoney(contractsEvaluated.reduce((sum, contract) => sum + contract.totals.consumed, 0));
  const projectedFinal = toMoney(
    contractsEvaluated.reduce((sum, contract) => sum + contract.totals.projectedFinal, 0),
  );
  const atRisk = toMoney(
    contractsEvaluated
      .filter((contract) => contract.status !== "ready")
      .reduce((sum, contract) => sum + Math.max(0, contract.totals.remaining), 0),
  );
  const expansionUpside = toMoney(
    contractsEvaluated.reduce(
      (sum, contract) =>
        sum +
        contract.streamSummaries
          .filter((stream) => stream.status === "overage-risk" || stream.status === "expansion-ready")
          .reduce((streamSum, stream) => streamSum + Math.max(0, stream.projectedVariance), 0),
      0,
    ),
  );

  const summary = {
    asOf: options.asOf || contracts[0]?.asOf || new Date().toISOString().slice(0, 10),
    portfolio: {
      contractCount: contractsEvaluated.length,
      committed,
      consumed,
      projectedFinal,
      projectedVariance: toMoney(projectedFinal - committed),
      atRisk,
      expansionUpside,
      averageRevenueCertaintyScore: contractsEvaluated.length
        ? Math.round(
            contractsEvaluated.reduce((sum, contract) => sum + contract.revenueCertaintyScore, 0) /
              contractsEvaluated.length,
          )
        : 0,
    },
    contracts: contractsEvaluated.sort((a, b) => a.revenueCertaintyScore - b.revenueCertaintyScore),
  };

  return {
    ...summary,
    auditDigest: auditDigest({
      asOf: summary.asOf,
      portfolio: summary.portfolio,
      contracts: summary.contracts.map((contract) => ({
        contractId: contract.contractId,
        status: contract.status,
        recommendation: contract.recommendation,
        auditDigest: contract.auditDigest,
      })),
    }),
  };
}

module.exports = {
  STREAMS,
  auditDigest,
  evaluateContract,
  evaluatePortfolio,
  formatUsd,
  stableJson,
};
