'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = Object.freeze({
  noticeDays: 90,
  legacyGraceDays: 45,
  materialIncreasePercent: 15,
  maxComputeRegressionPercent: 20,
  defaultConsentThresholdPercent: 12
});

const SEVERITY_RANK = Object.freeze({
  RELEASE_INVOICE: 0,
  REVIEW_BEFORE_RELEASE: 1,
  HOLD_INVOICE: 2
});

function parseDate(value, fieldName) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${fieldName}: ${value}`);
  }
  return date;
}

function daysBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS);
}

function percentChange(fromCents, toCents) {
  if (!fromCents) return toCents > 0 ? 100 : 0;
  return ((toCents - fromCents) / fromCents) * 100;
}

function roundPercent(value) {
  return Number(value.toFixed(2));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function classify(current, incoming) {
  return SEVERITY_RANK[incoming] > SEVERITY_RANK[current] ? incoming : current;
}

function formatMoney(cents, currency) {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${currency} ${(absolute / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function getTargetCurrency(account) {
  return account.targetPlan.currency || account.currency;
}

function findMissingAddOns(currentAddOns, targetAddOns) {
  const target = new Set(targetAddOns || []);
  return (currentAddOns || []).filter((addOn) => !target.has(addOn));
}

function evaluateAccount(account, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(options.policy || {}) };
  const asOf = parseDate(options.asOf, 'asOf') || new Date();
  const current = account.currentPlan || {};
  const target = account.targetPlan || {};
  const contract = account.contract || {};
  const usage = account.usage || {};
  const discounts = account.discounts || {};
  const evidence = account.evidence || {};
  const flags = account.flags || {};

  let decision = 'RELEASE_INVOICE';
  const reasons = [];
  const actions = [];

  function add(severity, code, message, action) {
    decision = classify(decision, severity);
    reasons.push({ severity, code, message });
    if (action) actions.push(action);
  }

  const currentPrice = Number(current.monthlyPriceCents || 0);
  const targetPrice = Number(target.monthlyPriceCents || 0);
  const priceDeltaCents = targetPrice - currentPrice;
  const increasePercent = roundPercent(percentChange(currentPrice, targetPrice));
  const targetCurrency = getTargetCurrency(account);

  const priceLockUntil = parseDate(contract.priceLockUntil, 'contract.priceLockUntil');
  const grandfatheredUntil = parseDate(contract.grandfatheredUntil, 'contract.grandfatheredUntil');
  const noticeSentAt = parseDate(contract.noticeSentAt, 'contract.noticeSentAt');

  if (priceDeltaCents > 0 && priceLockUntil && asOf <= priceLockUntil) {
    add(
      'HOLD_INVOICE',
      'ACTIVE_PRICE_LOCK',
      `Price lock remains active until ${contract.priceLockUntil}.`,
      'Keep the account on the legacy price book until the price lock expires or a new order form is signed.'
    );
  }

  if (priceDeltaCents > 0 && grandfatheredUntil) {
    if (asOf <= grandfatheredUntil && contract.allowsAutoMigration === false) {
      add(
        'HOLD_INVOICE',
        'GRANDFATHERING_BLOCKS_AUTO_MIGRATION',
        `Contract is grandfathered until ${contract.grandfatheredUntil} and does not allow automatic migration.`,
        'Request explicit customer approval before creating a new-price invoice.'
      );
    } else if (asOf > grandfatheredUntil) {
      const daysAfterGrandfathering = daysBetween(grandfatheredUntil, asOf);
      if (daysAfterGrandfathering <= policy.legacyGraceDays) {
        add(
          'REVIEW_BEFORE_RELEASE',
          'INSIDE_LEGACY_GRACE_PERIOD',
          `Grandfathering ended ${daysAfterGrandfathering} days ago, inside the ${policy.legacyGraceDays}-day review grace period.`,
          'Route through renewals review before release.'
        );
      }
    }
  }

  if (priceDeltaCents > 0) {
    if (!noticeSentAt) {
      add(
        'HOLD_INVOICE',
        'MISSING_CUSTOMER_NOTICE',
        'No customer price-change notice date is present.',
        'Send customer notice and restart the notice clock.'
      );
    } else {
      const noticeAgeDays = daysBetween(noticeSentAt, asOf);
      if (noticeAgeDays < policy.noticeDays) {
        add(
          'HOLD_INVOICE',
          'NOTICE_WINDOW_NOT_MET',
          `Customer notice is ${noticeAgeDays} days old; policy requires ${policy.noticeDays} days.`,
          'Hold invoice release until the notice window is satisfied.'
        );
      }
    }
  }

  const consentThreshold = Number(
    contract.requiresConsentAbovePct ?? policy.defaultConsentThresholdPercent
  );
  if (priceDeltaCents > 0 && increasePercent >= consentThreshold && !contract.consentReceivedAt) {
    add(
      'HOLD_INVOICE',
      'MISSING_MATERIAL_INCREASE_CONSENT',
      `Increase is ${increasePercent}% and requires consent above ${consentThreshold}%.`,
      'Collect explicit consent or signed renewal before migration.'
    );
  }

  if (increasePercent >= policy.materialIncreasePercent && !evidence.legalApproval) {
    add(
      'REVIEW_BEFORE_RELEASE',
      'MATERIAL_INCREASE_NEEDS_LEGAL_REVIEW',
      `Increase is ${increasePercent}%, above the ${policy.materialIncreasePercent}% materiality threshold.`,
      'Attach legal approval before release.'
    );
  }

  if (account.currency !== targetCurrency && !evidence.financeApproval) {
    add(
      'HOLD_INVOICE',
      'CURRENCY_CHANGE_WITHOUT_FINANCE_APPROVAL',
      `Currency changes from ${account.currency} to ${targetCurrency}.`,
      'Add finance approval and settlement notes for the currency migration.'
    );
  }

  if (usage.activeSeats && target.includedSeats && target.includedSeats < usage.activeSeats) {
    add(
      'HOLD_INVOICE',
      'SEAT_CAP_REGRESSION',
      `Target plan includes ${target.includedSeats} seats but current usage has ${usage.activeSeats}.`,
      'Increase target seat allowance or collect admin confirmation for seat reduction.'
    );
  }

  if (
    usage.averageComputeHours &&
    target.includedComputeHours &&
    current.includedComputeHours &&
    target.includedComputeHours < usage.averageComputeHours
  ) {
    const computeRegressionPercent = roundPercent(
      ((current.includedComputeHours - target.includedComputeHours) /
        current.includedComputeHours) *
        100
    );
    const severity =
      computeRegressionPercent > policy.maxComputeRegressionPercent
        ? 'HOLD_INVOICE'
        : 'REVIEW_BEFORE_RELEASE';
    add(
      severity,
      'COMPUTE_ENTITLEMENT_REGRESSION',
      `Target compute allowance is ${target.includedComputeHours} hours while recent usage is ${usage.averageComputeHours}.`,
      'Confirm customer-facing compute entitlement changes before billing.'
    );
  }

  const missingAddOns = findMissingAddOns(current.addOns, target.addOns);
  if (missingAddOns.length > 0) {
    add(
      'HOLD_INVOICE',
      'ADD_ON_PARITY_GAP',
      `Target plan is missing legacy add-ons: ${missingAddOns.join(', ')}.`,
      'Add equivalent add-ons or document an accepted replacement.'
    );
  } else if ((current.addOns || []).length > 0 && evidence.addOnParityReview !== 'passed') {
    add(
      'REVIEW_BEFORE_RELEASE',
      'ADD_ON_PARITY_REVIEW_MISSING',
      'Legacy add-ons are present but no passed parity review is attached.',
      'Attach add-on parity review evidence.'
    );
  }

  if (discounts.annualCommitment && target.billingCycle !== 'annual') {
    add(
      'REVIEW_BEFORE_RELEASE',
      'ANNUAL_COMMITMENT_BILLING_CYCLE_CHANGE',
      'Account has an annual commitment but target plan is not annual.',
      'Review annual discount compatibility before release.'
    );
  }

  if (discounts.volumePercent > 0 && target.includedSeats < current.includedSeats) {
    add(
      'REVIEW_BEFORE_RELEASE',
      'VOLUME_DISCOUNT_SEAT_BASE_CHANGED',
      `Volume discount ${discounts.volumePercent}% is tied to ${current.includedSeats} legacy seats.`,
      'Confirm volume discount recalculation with revenue operations.'
    );
  }

  if (!contract.signedOrderFormAt && account.segment === 'institution') {
    add(
      'REVIEW_BEFORE_RELEASE',
      'ORDER_FORM_EVIDENCE_MISSING',
      'Institutional account does not have signed order form evidence.',
      'Attach signed order form or renewal packet.'
    );
  }

  if (!evidence.migrationRunbook) {
    add(
      'REVIEW_BEFORE_RELEASE',
      'MIGRATION_RUNBOOK_MISSING',
      'No migration runbook is linked for reviewer replay.',
      'Attach the price-book migration runbook.'
    );
  }

  if (flags.billingDispute) {
    add(
      'HOLD_INVOICE',
      'ACTIVE_BILLING_DISPUTE',
      'Account has an active billing dispute.',
      'Resolve the dispute before releasing a migration invoice.'
    );
  }

  if (flags.delinquent) {
    add(
      'HOLD_INVOICE',
      'DELINQUENT_ACCOUNT',
      'Account is delinquent and should not be silently migrated.',
      'Move the account through collections or customer-success review.'
    );
  }

  if (flags.strategicAccount && !evidence.salesOwner) {
    add(
      'REVIEW_BEFORE_RELEASE',
      'STRATEGIC_ACCOUNT_OWNER_MISSING',
      'Strategic account lacks a sales-owner signoff.',
      'Attach named sales owner or renewal owner signoff.'
    );
  }

  const sortedReasons = reasons.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.code.localeCompare(b.code)
  );

  return {
    accountId: account.id,
    accountName: account.name,
    segment: account.segment,
    decision,
    priceImpact: {
      currentMonthlyCents: currentPrice,
      targetMonthlyCents: targetPrice,
      deltaMonthlyCents: priceDeltaCents,
      increasePercent,
      displayDelta: formatMoney(priceDeltaCents, targetCurrency)
    },
    entitlementImpact: {
      seatDelta: Number(target.includedSeats || 0) - Number(current.includedSeats || 0),
      computeHourDelta:
        Number(target.includedComputeHours || 0) - Number(current.includedComputeHours || 0),
      missingAddOns
    },
    evidence: {
      customerNoticeId: evidence.customerNoticeId || null,
      consentReceivedAt: contract.consentReceivedAt || null,
      financeApproval: evidence.financeApproval || null,
      legalApproval: evidence.legalApproval || null,
      migrationRunbook: evidence.migrationRunbook || null,
      salesOwner: evidence.salesOwner || null
    },
    reasons: sortedReasons,
    actions: unique(actions),
    riskScore: sortedReasons.reduce((total, reason) => total + SEVERITY_RANK[reason.severity], 0)
  };
}

function evaluatePortfolio(packet, options = {}) {
  const asOf = options.asOf || packet.asOf;
  const policy = { ...DEFAULT_POLICY, ...(packet.policy || {}), ...(options.policy || {}) };
  const results = (packet.accounts || []).map((account) =>
    evaluateAccount(account, { asOf, policy })
  );
  return {
    asOf,
    policy,
    summary: summarizeResults(results),
    results
  };
}

function summarizeResults(results) {
  const summary = {
    totalAccounts: results.length,
    release: 0,
    review: 0,
    hold: 0,
    totalMonthlyDeltaCents: 0,
    heldAccountIds: [],
    reviewAccountIds: [],
    topRisks: []
  };

  for (const result of results) {
    summary.totalMonthlyDeltaCents += result.priceImpact.deltaMonthlyCents;
    if (result.decision === 'RELEASE_INVOICE') summary.release += 1;
    if (result.decision === 'REVIEW_BEFORE_RELEASE') {
      summary.review += 1;
      summary.reviewAccountIds.push(result.accountId);
    }
    if (result.decision === 'HOLD_INVOICE') {
      summary.hold += 1;
      summary.heldAccountIds.push(result.accountId);
    }
  }

  summary.topRisks = results
    .flatMap((result) =>
      result.reasons.map((reason) => ({
        accountId: result.accountId,
        severity: reason.severity,
        code: reason.code
      }))
    )
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, 8);

  return summary;
}

function buildMarkdownReport(portfolio) {
  const lines = [
    '# Grandfathered Pricing Migration Report',
    '',
    `As of: ${portfolio.asOf}`,
    '',
    '## Summary',
    '',
    `- Total accounts: ${portfolio.summary.totalAccounts}`,
    `- Release: ${portfolio.summary.release}`,
    `- Review: ${portfolio.summary.review}`,
    `- Hold: ${portfolio.summary.hold}`,
    `- Monthly revenue delta: ${formatMoney(portfolio.summary.totalMonthlyDeltaCents, 'USD')} before currency-specific settlement review`,
    '',
    '## Account Decisions',
    '',
    '| Account | Decision | Monthly delta | Primary reason |',
    '| --- | --- | ---: | --- |'
  ];

  for (const result of portfolio.results) {
    const primary = result.reasons[0]
      ? `${result.reasons[0].code}: ${result.reasons[0].message}`
      : 'All release checks passed';
    lines.push(
      `| ${result.accountName} | ${result.decision} | ${result.priceImpact.displayDelta} | ${primary} |`
    );
  }

  lines.push('', '## Release Actions', '');
  for (const result of portfolio.results) {
    lines.push(`### ${result.accountName}`);
    if (result.actions.length === 0) {
      lines.push('- Release invoice under the target price book.');
    } else {
      for (const action of result.actions) lines.push(`- ${action}`);
    }
    lines.push('');
  }

  while (lines[lines.length - 1] === '') lines.pop();
  return `${lines.join('\n')}\n`;
}

function buildSvgSummary(portfolio) {
  const width = 860;
  const height = 360;
  const releaseWidth = portfolio.summary.release * 90;
  const reviewWidth = portfolio.summary.review * 90;
  const holdWidth = portfolio.summary.hold * 90;
  const escape = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const rows = portfolio.results
    .map((result, index) => {
      const y = 176 + index * 30;
      const color =
        result.decision === 'HOLD_INVOICE'
          ? '#c2410c'
          : result.decision === 'REVIEW_BEFORE_RELEASE'
            ? '#a16207'
            : '#15803d';
      return `<text x="42" y="${y}" font-size="14" fill="#111827">${escape(result.accountName)}</text><text x="520" y="${y}" font-size="14" fill="${color}" font-weight="700">${result.decision}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Grandfathered pricing migration guard summary</title>
  <desc id="desc">Portfolio release, review, and hold counts for synthetic price-book migrations.</desc>
  <rect width="860" height="360" fill="#f8fafc"/>
  <text x="40" y="48" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#111827">Grandfathered Pricing Migration Guard</text>
  <text x="40" y="78" font-size="15" font-family="Arial, sans-serif" fill="#475569">Synthetic reviewer packet for Revenue Infrastructure issue #20</text>
  <rect x="40" y="108" width="${releaseWidth}" height="28" rx="4" fill="#16a34a"/>
  <rect x="${40 + releaseWidth}" y="108" width="${reviewWidth}" height="28" rx="4" fill="#ca8a04"/>
  <rect x="${40 + releaseWidth + reviewWidth}" y="108" width="${holdWidth}" height="28" rx="4" fill="#ea580c"/>
  <text x="40" y="156" font-size="13" font-family="Arial, sans-serif" fill="#111827">Release: ${portfolio.summary.release} | Review: ${portfolio.summary.review} | Hold: ${portfolio.summary.hold}</text>
  ${rows}
</svg>
`;
}

module.exports = {
  DEFAULT_POLICY,
  buildMarkdownReport,
  buildSvgSummary,
  evaluateAccount,
  evaluatePortfolio,
  formatMoney,
  summarizeResults
};
