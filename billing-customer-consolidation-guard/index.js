function list(value) {
  return Array.isArray(value) ? value : [];
}

function cents(value) {
  return Number.isFinite(value) ? value : 0;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function formatMoney(centsValue) {
  return `$${(centsValue / 100).toFixed(2)}`;
}

function fullDaysBetween(older, newer) {
  const olderTime = Date.parse(older);
  const newerTime = Date.parse(newer);
  if (!Number.isFinite(olderTime) || !Number.isFinite(newerTime)) {
    return Infinity;
  }
  return Math.floor((newerTime - olderTime) / 86400000);
}

function addFinding(findings, requiredActions, finding, action) {
  findings.push(finding);
  if (action) {
    requiredActions.push(action);
  }
}

function action(type, target, reason) {
  return {type, target, reason};
}

function collectProfiles(input) {
  return list(input.profiles).map((profile) => ({
    ...profile,
    subscriptions: list(profile.subscriptions),
    invoices: list(profile.invoices),
    computeCreditLots: list(profile.computeCreditLots),
    coupons: list(profile.coupons),
    analyticsSeats: profile.analyticsSeats || {},
  }));
}

function uniqueFilled(values) {
  return [...new Set(values.map(normalize).filter(Boolean))].sort();
}

function activeSubscriptions(profile) {
  return profile.subscriptions.filter((subscription) => normalize(subscription.status) === 'active');
}

function openInvoices(profile) {
  return profile.invoices.filter((invoice) => cents(invoice.balanceCents) > 0 && normalize(invoice.status) !== 'void');
}

function creditLots(profile) {
  return profile.computeCreditLots.filter((lot) => cents(lot.remainingCents) > 0);
}

function summarize(profiles) {
  const profileIds = profiles.map((profile) => profile.id || 'unknown-profile');
  const subscriptionIds = [];
  const invoiceIds = [];
  let openReceivableCents = 0;
  let creditBalanceCents = 0;
  const analyticsSeats = {dashboard: 0, api: 0};

  for (const profile of profiles) {
    for (const subscription of profile.subscriptions) {
      if (hasText(subscription.id)) {
        subscriptionIds.push(subscription.id);
      }
    }
    for (const invoice of profile.invoices) {
      if (hasText(invoice.id)) {
        invoiceIds.push(invoice.id);
      }
      if (cents(invoice.balanceCents) > 0 && normalize(invoice.status) !== 'void') {
        openReceivableCents += cents(invoice.balanceCents);
      }
    }
    for (const lot of creditLots(profile)) {
      creditBalanceCents += cents(lot.remainingCents);
    }
    analyticsSeats.dashboard += cents(profile.analyticsSeats.dashboard);
    analyticsSeats.api += cents(profile.analyticsSeats.api);
  }

  return {
    profileIds,
    subscriptionIds,
    invoiceIds,
    openReceivableCents,
    creditBalanceCents,
    analyticsSeats,
  };
}

function findDuplicateActiveSubscriptions(profiles) {
  const byProduct = new Map();
  for (const profile of profiles) {
    for (const subscription of activeSubscriptions(profile)) {
      const product = normalize(subscription.product || subscription.plan || subscription.id);
      if (!product) {
        continue;
      }
      if (!byProduct.has(product)) {
        byProduct.set(product, []);
      }
      byProduct.get(product).push({
        profileId: profile.id || 'unknown-profile',
        subscriptionId: subscription.id || 'unknown-subscription',
        product,
      });
    }
  }

  return [...byProduct.values()].filter((entries) => entries.length > 1);
}

function shouldReviewCreditTransfer(profiles, generatedAt) {
  const lots = profiles.flatMap((profile) => creditLots(profile));
  const total = lots.reduce((sum, lot) => sum + cents(lot.remainingCents), 0);
  const expiringSoon = lots.some((lot) => fullDaysBetween(generatedAt, lot.expiresAt) <= 120);
  return lots.length > 0 && (total >= 100000 || expiringSoon);
}

function countSeverities(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {critical: 0, high: 0, medium: 0});
}

function decide(findings) {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return 'block-consolidation';
  }
  if (findings.length > 0) {
    return 'finance-review';
  }
  return 'ready-to-consolidate';
}

function evaluateBillingCustomerConsolidation(input) {
  const generatedAt = input.generatedAt || new Date(0).toISOString();
  const profiles = collectProfiles(input);
  const findings = [];
  const requiredActions = [];
  const legalNames = uniqueFilled(profiles.map((profile) => profile.legalName));
  const taxIds = uniqueFilled(profiles.map((profile) => profile.taxId));
  const profileIds = profiles.map((profile) => profile.id || 'unknown-profile');
  const summaryBase = summarize(profiles);

  if (legalNames.length > 1 || taxIds.length > 1) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'legal-entity-conflict',
        severity: 'critical',
        target: profileIds.join(', '),
        legalNames,
        taxIds,
        message: 'Duplicate billing profiles resolve to conflicting legal names or tax identifiers.',
      },
      action(
        'route_to_finance_legal_review',
        input.institutionId || 'institution',
        'legal entity identity must be resolved before invoices, credits, or entitlements merge'
      )
    );
  }

  const duplicateSubscriptions = findDuplicateActiveSubscriptions(profiles);
  if (duplicateSubscriptions.length > 0) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'duplicate-active-subscription',
        severity: 'high',
        target: duplicateSubscriptions.map((group) => group[0].product).join(', '),
        subscriptions: duplicateSubscriptions.flat(),
        message: 'More than one active subscription exists for the same revenue product.',
      },
      action(
        'choose_surviving_subscription',
        input.survivorProfileId || 'survivor-profile',
        'finance must prevent double billing or accidental entitlement loss before merge'
      )
    );
  }

  if (shouldReviewCreditTransfer(profiles, generatedAt)) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'credit-balance-transfer-required',
        severity: 'high',
        target: input.survivorProfileId || 'survivor-profile',
        creditBalanceCents: summaryBase.creditBalanceCents,
        message: 'Compute credit balances need explicit survivor-account transfer evidence.',
      },
      action(
        'preserve_credit_lots',
        input.survivorProfileId || 'survivor-profile',
        'prepaid or expiring compute credits must not disappear during customer consolidation'
      )
    );
  }

  const unverifiedPaymentProfiles = profiles
    .filter((profile) => profile.paymentEvidence && profile.paymentEvidence.verified === false)
    .map((profile) => profile.id || 'unknown-profile');
  if (unverifiedPaymentProfiles.length > 0) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'unverified-payment-evidence',
        severity: 'high',
        target: unverifiedPaymentProfiles.join(', '),
        message: 'One or more merged profiles has unverified payment evidence.',
      },
      action(
        'verify_payment_evidence',
        unverifiedPaymentProfiles.join(', '),
        'survivor profile should not inherit paid features from unverified payment records'
      )
    );
  }

  const receivableProfiles = profiles
    .filter((profile) => openInvoices(profile).length > 0)
    .map((profile) => profile.id || 'unknown-profile');
  if (receivableProfiles.length > 0) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'open-receivable-preservation',
        severity: findings.some((finding) => finding.type === 'legal-entity-conflict') ? 'high' : 'medium',
        target: receivableProfiles.join(', '),
        openReceivableCents: summaryBase.openReceivableCents,
        message: 'Open invoice balances must remain traceable after profile consolidation.',
      },
      action(
        'preserve_open_receivables',
        receivableProfiles.join(', '),
        'AR balances, due dates, and invoice ownership must survive billing profile merge'
      )
    );
  }

  const severities = countSeverities(findings);
  const decision = decide(findings);
  const survivorDraft = {
    survivorProfileId: input.survivorProfileId || profileIds[0] || 'survivor-profile',
    profileIds: summaryBase.profileIds,
    subscriptionIds: summaryBase.subscriptionIds,
    invoiceIds: summaryBase.invoiceIds,
    openReceivableCents: summaryBase.openReceivableCents,
    creditBalanceCents: summaryBase.creditBalanceCents,
    analyticsSeats: summaryBase.analyticsSeats,
    holdReason: decision === 'block-consolidation'
      ? 'Blocked until legal entity identity conflict is resolved.'
      : '',
  };

  return {
    institutionId: input.institutionId || 'unknown-institution',
    generatedAt,
    decision,
    summary: {
      profiles: profiles.length,
      activeSubscriptions: profiles.reduce((sum, profile) => sum + activeSubscriptions(profile).length, 0),
      duplicateSubscriptionGroups: duplicateSubscriptions.length,
      openReceivableCents: summaryBase.openReceivableCents,
      creditBalanceCents: summaryBase.creditBalanceCents,
      requiredActions: requiredActions.length,
      ...severities,
    },
    survivorDraft,
    findings,
    requiredActions,
  };
}

function buildFinanceReviewPacket(result) {
  const lines = [
    '# Billing Customer Consolidation Guard',
    '',
    `Institution: ${result.institutionId}`,
    `Decision: ${result.decision}`,
    `Generated: ${result.generatedAt}`,
    '',
    '## Survivor Draft',
    '',
    `- Survivor profile: ${result.survivorDraft.survivorProfileId}`,
    `- Profiles merged: ${result.survivorDraft.profileIds.join(', ')}`,
    `- Subscriptions preserved: ${result.survivorDraft.subscriptionIds.join(', ') || 'none'}`,
    `- Invoices preserved: ${result.survivorDraft.invoiceIds.join(', ') || 'none'}`,
    `- Open receivables: ${formatMoney(result.summary.openReceivableCents)}`,
    `- Preserved credit balance: ${formatMoney(result.summary.creditBalanceCents)}`,
    `- Analytics seats: ${result.survivorDraft.analyticsSeats.dashboard} dashboard, ${result.survivorDraft.analyticsSeats.api} API`,
    '',
  ];

  if (result.findings.length === 0) {
    lines.push('No blocking billing consolidation risks detected.');
  } else {
    lines.push('## Findings', '');
    for (const finding of result.findings) {
      lines.push(`- **${finding.severity}** ${finding.type}: ${finding.message}`);
    }
    lines.push('', '## Required Actions', '');
    for (const item of result.requiredActions) {
      lines.push(`- ${item.type} (${item.target}): ${item.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  evaluateBillingCustomerConsolidation,
  buildFinanceReviewPacket,
};
