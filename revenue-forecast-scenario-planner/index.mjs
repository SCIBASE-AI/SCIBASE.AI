export function buildRevenueForecast(input) {
  const months = buildMonthRange(input.startMonth, input.months);
  const accounts = (input.accounts ?? []).filter((account) => account.status !== "inactive");
  const computeUsage = input.computeUsage ?? [];
  const licensingDeals = input.licensingDeals ?? [];

  const monthlyReports = months.map((month) => {
    const subscriptionsCents = sum(
      accounts.map((account) => subscriptionRevenueCents(account, input.plans)),
    );
    const computeCents = sum(
      computeUsage
        .filter((usage) => usage.month === month)
        .map((usage) => computeOverageCents(usage, accounts, input.plans)),
    );
    const licensingCents = sum(
      licensingDeals
        .filter((deal) => month >= deal.startsAtMonth)
        .map((deal) => Math.round(deal.monthlyCents * clampProbability(deal.probability))),
    );

    return {
      month,
      streams: {
        subscriptionsCents,
        computeCents,
        licensingCents,
      },
      totalCents: subscriptionsCents + computeCents + licensingCents,
    };
  });

  const baseTotalCents = sum(monthlyReports.map((month) => month.totalCents));

  return {
    startMonth: input.startMonth,
    horizonMonths: input.months,
    months: monthlyReports,
    summary: {
      totalCents: baseTotalCents,
      exitMrrCents: monthlyReports.at(-1)?.totalCents ?? 0,
      exitArrCents: (monthlyReports.at(-1)?.totalCents ?? 0) * 12,
    },
    scenarios: {
      downside: scenarioProjection(months, accounts, input.plans, "downside"),
      base: {
        totalCents: baseTotalCents,
        monthlyTotals: monthlyReports.map((month) => ({
          month: month.month,
          totalCents: month.totalCents,
        })),
      },
      upside: scenarioProjection(months, accounts, input.plans, "upside"),
    },
    actions: buildActions(months, accounts, computeUsage, licensingDeals, input.plans),
  };
}

export function summarizeForecast(forecast) {
  return [
    `Revenue forecast: ${formatCents(forecast.summary.totalCents)} over ${forecast.horizonMonths} months`,
    `Exit MRR: ${formatCents(forecast.summary.exitMrrCents)}`,
    `Exit ARR: ${formatCents(forecast.summary.exitArrCents)}`,
    `Actions: ${forecast.actions.length}`,
  ].join("\n");
}

function subscriptionRevenueCents(account, plans) {
  const plan = requirePlan(account.plan, plans);
  const gross = account.seats * plan.monthlySeatCents;
  if (account.billingCycle !== "annual") {
    return gross;
  }
  return Math.round(gross * (1 - (plan.annualDiscountPct ?? 0) / 100));
}

function computeOverageCents(usage, accounts, plans) {
  const account = accounts.find((candidate) => candidate.id === usage.accountId);
  if (!account) {
    return 0;
  }
  const plan = requirePlan(account.plan, plans);
  const overageUnits = Math.max(0, usage.units - plan.includedComputeUnits);
  return overageUnits * plan.overageUnitCents;
}

function buildActions(months, accounts, computeUsage, licensingDeals, plans) {
  const computeActions = computeUsage.flatMap((usage) => {
    if (!months.includes(usage.month)) {
      return [];
    }
    const account = accounts.find((candidate) => candidate.id === usage.accountId);
    if (!account) {
      return [];
    }
    const plan = requirePlan(account.plan, plans);
    if (usage.units < plan.includedComputeUnits * 0.8) {
      return [];
    }
    return [
      {
        type: "compute_quota_pressure",
        target: account.id,
        month: usage.month,
        severity: usage.units > plan.includedComputeUnits ? "high" : "watch",
        recommendation: "Review quota burn, top-up pricing, and upgrade path before month close.",
      },
    ];
  });

  const renewalActions = accounts.flatMap((account) => {
    if (!account.renewalMonth || !months.includes(account.renewalMonth)) {
      return [];
    }
    if ((account.churnRisk ?? 0) < 0.25) {
      return [];
    }
    return [
      {
        type: "renewal_risk",
        target: account.id,
        month: account.renewalMonth,
        severity: account.churnRisk >= 0.4 ? "high" : "watch",
        recommendation: "Prepare retention owner, expansion path, and finance forecast adjustment.",
      },
    ];
  });

  const licensingActions = licensingDeals.flatMap((deal) => {
    if (!months.some((month) => month >= deal.startsAtMonth)) {
      return [];
    }
    if (clampProbability(deal.probability) >= 0.5) {
      return [];
    }
    return [
      {
        type: "license_confidence_gap",
        target: deal.id,
        month: deal.startsAtMonth,
        severity: "watch",
        recommendation: "Confirm buyer intent, data-safety review, and minimum viable analytics scope.",
      },
    ];
  });

  return [...computeActions, ...renewalActions, ...licensingActions];
}

function scenarioProjection(months, accounts, plans, scenario) {
  const monthlyTotals = months.map((month) => {
    const totalCents = sum(
      accounts.map((account) => {
        const plan = requirePlan(account.plan, plans);
        const baseSeats =
          scenario === "upside"
            ? account.seats + Math.max(0, account.expectedSeatDelta ?? 0)
            : account.seats;
        const adjustedAccount = {
          ...account,
          seats: baseSeats,
        };
        const subscription = subscriptionRevenueCents(adjustedAccount, plans);
        if (scenario !== "downside") {
          return subscription;
        }
        return Math.round(subscription * (1 - clampProbability(account.churnRisk ?? 0)));
      }),
    );
    return { month, totalCents };
  });

  return {
    totalCents: sum(monthlyTotals.map((entry) => entry.totalCents)),
    monthlyTotals,
  };
}

function buildMonthRange(startMonth, monthCount) {
  if (!/^\d{4}-\d{2}$/.test(startMonth)) {
    throw new Error("startMonth must use YYYY-MM format");
  }
  if (!Number.isInteger(monthCount) || monthCount < 1) {
    throw new Error("months must be a positive integer");
  }

  const [startYear, startMonthIndex] = startMonth.split("-").map(Number);
  return Array.from({ length: monthCount }, (_, index) => {
    const zeroBasedMonth = startMonthIndex - 1 + index;
    const year = startYear + Math.floor(zeroBasedMonth / 12);
    const month = (zeroBasedMonth % 12) + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  });
}

function requirePlan(planName, plans) {
  const plan = plans?.[planName];
  if (!plan) {
    throw new Error(`Unknown plan: ${planName}`);
  }
  return plan;
}

function clampProbability(value) {
  return Math.max(0, Math.min(1, value ?? 0));
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatCents(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
