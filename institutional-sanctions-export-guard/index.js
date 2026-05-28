const crypto = require('crypto');

const RESTRICTED_JURISDICTIONS = new Set([
  'restricted-region',
  'embargoed-territory',
  'sanctioned-zone'
]);

const REVENUE_ENTITLEMENTS = [
  'institutional-license',
  'ai-compute-bundle',
  'analytics-api-export'
];

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function buyerRef(request) {
  return request.publicBuyerRef || `buyer-ref:${request.id}`;
}

function hasRestrictedJurisdiction(request) {
  return RESTRICTED_JURISDICTIONS.has(normalize(request.jurisdiction));
}

function hasExportControlGap(request) {
  return Boolean(
    request.packages.some((item) => item.exportControlled) &&
      !request.exportClearanceId
  );
}

function hasPaymentRailGap(request) {
  return Boolean(!request.paymentRailAvailable);
}

function flagsForRequest(request) {
  const flags = [];

  if (request.restrictedPartyMatch) {
    flags.push('restricted-party-match');
  }

  if (hasRestrictedJurisdiction(request)) {
    flags.push('restricted-jurisdiction');
  }

  if (request.packages.some((item) => item.exportControlled)) {
    flags.push('export-controlled-compute');
  }

  if (hasExportControlGap(request)) {
    flags.push('missing-export-clearance');
  }

  if (hasPaymentRailGap(request)) {
    flags.push('payment-rail-unavailable');
  }

  return [...new Set(flags)];
}

function decisionForFlags(flags) {
  if (
    flags.includes('restricted-party-match') ||
    flags.includes('restricted-jurisdiction') ||
    flags.includes('missing-export-clearance')
  ) {
    return 'compliance-hold';
  }

  if (flags.includes('payment-rail-unavailable')) {
    return 'manual-billing-review';
  }

  return 'activate-revenue';
}

function evaluateRequest(request) {
  const flags = flagsForRequest(request);
  const decision = decisionForFlags(flags);

  return {
    id: request.id,
    buyer: buyerRef(request),
    jurisdiction: request.jurisdiction,
    customerType: request.customerType,
    amountUsd: request.amountUsd,
    decision,
    flags,
    requestedEntitlements: request.packages.map((item) => item.entitlement),
    evidenceDigest: digest({
      id: request.id,
      buyer: buyerRef(request),
      jurisdiction: request.jurisdiction,
      customerType: request.customerType,
      amountUsd: request.amountUsd,
      packages: request.packages,
      exportClearanceId: request.exportClearanceId || null,
      restrictedPartyMatch: Boolean(request.restrictedPartyMatch),
      paymentRailAvailable: Boolean(request.paymentRailAvailable)
    })
  };
}

function revenueActionForRequest(request, decision) {
  if (decision.decision === 'activate-revenue') {
    return {
      id: `activate-${request.id}`,
      requestId: request.id,
      buyer: decision.buyer,
      invoiceAction: 'issue-invoice',
      entitlementAction: 'activate-entitlements',
      recognizableAmountUsd: request.amountUsd,
      deferredAmountUsd: 0
    };
  }

  if (decision.decision === 'manual-billing-review') {
    return {
      id: `review-${request.id}`,
      requestId: request.id,
      buyer: decision.buyer,
      invoiceAction: 'manual-review',
      entitlementAction: 'defer-activation',
      recognizableAmountUsd: 0,
      deferredAmountUsd: request.amountUsd,
      reviewReasons: decision.flags
    };
  }

  return {
    id: `hold-${request.id}`,
    requestId: request.id,
    buyer: decision.buyer,
    invoiceAction: 'hold-invoice',
    entitlementAction: 'block-entitlements',
    recognizableAmountUsd: 0,
    deferredAmountUsd: request.amountUsd,
    blockedEntitlements: REVENUE_ENTITLEMENTS,
    holdReasons: decision.flags
  };
}

function complianceTaskForDecision(decision) {
  if (decision.decision === 'activate-revenue') {
    return null;
  }

  const exportClearanceNeeded = decision.flags.includes('missing-export-clearance');
  const restrictedPartyNeeded =
    decision.flags.includes('restricted-party-match') ||
    decision.flags.includes('restricted-jurisdiction');

  return {
    id: `task-${decision.id}`,
    requestId: decision.id,
    buyer: decision.buyer,
    priority: decision.decision === 'compliance-hold' ? 'high' : 'normal',
    requiredAction: exportClearanceNeeded
      ? 'collect-export-clearance-before-revenue-activation'
      : restrictedPartyNeeded
        ? 'resolve-restricted-party-screening-before-invoicing'
        : 'route-to-supported-institutional-payment-rail',
    flags: decision.flags,
    blockedUntilResolved: decision.decision === 'compliance-hold'
  };
}

function buildAuditPacket(batch, customerDecisions, revenueActions, complianceTasks) {
  const events = [
    ...customerDecisions.map((decision) => ({
      type: 'eligibility-decision',
      requestId: decision.id,
      buyer: decision.buyer,
      decision: decision.decision,
      flags: decision.flags
    })),
    ...revenueActions.map((action) => ({
      type: 'revenue-action',
      requestId: action.requestId,
      buyer: action.buyer,
      invoiceAction: action.invoiceAction,
      entitlementAction: action.entitlementAction,
      recognizableAmountUsd: action.recognizableAmountUsd,
      deferredAmountUsd: action.deferredAmountUsd
    })),
    ...complianceTasks.map((task) => ({
      type: 'compliance-task',
      taskId: task.id,
      requestId: task.requestId,
      priority: task.priority,
      requiredAction: task.requiredAction
    }))
  ];

  return {
    batchId: batch.batchId,
    generatedAt: batch.asOf,
    events,
    auditDigest: digest({
      batchId: batch.batchId,
      generatedAt: batch.asOf,
      events
    })
  };
}

function evaluateEligibility(batch) {
  const customerDecisions = batch.requests.map(evaluateRequest);
  const revenueActions = batch.requests.map((request, index) =>
    revenueActionForRequest(request, customerDecisions[index])
  );
  const complianceTasks = customerDecisions
    .map(complianceTaskForDecision)
    .filter(Boolean);
  const auditPacket = buildAuditPacket(batch, customerDecisions, revenueActions, complianceTasks);

  return {
    batchId: batch.batchId,
    generatedAt: batch.asOf,
    customerDecisions,
    revenueActions,
    complianceTasks,
    auditPacket,
    summary: {
      totalRequests: customerDecisions.length,
      complianceHolds: customerDecisions.filter((decision) => decision.decision === 'compliance-hold').length,
      manualReviews: customerDecisions.filter((decision) => decision.decision === 'manual-billing-review').length,
      recognizableRevenueUsd: revenueActions.reduce(
        (total, action) => total + action.recognizableAmountUsd,
        0
      ),
      deferredRevenueUsd: revenueActions.reduce(
        (total, action) => total + action.deferredAmountUsd,
        0
      ),
      recommendedAction: complianceTasks.length > 0
        ? 'pause-institutional-revenue-activation'
        : 'activate-eligible-revenue'
    }
  };
}

function buildSampleInstitutionalBatch() {
  return {
    batchId: 'institutional-eligibility-2026-05-28',
    asOf: '2026-05-28T12:55:00Z',
    requests: [
      {
        id: 'license-cryo-bio-east',
        publicBuyerRef: 'buyer-ref:cryo-bio-east',
        buyerContact: 'procurement@cryo.example',
        taxIdentifier: 'tax-id-998877',
        customerType: 'government-lab',
        jurisdiction: 'restricted-region',
        restrictedPartyMatch: true,
        paymentRailAvailable: true,
        amountUsd: 120000,
        packages: [
          { entitlement: 'institutional-license', exportControlled: false },
          { entitlement: 'ai-compute-bundle', exportControlled: true },
          { entitlement: 'analytics-api-export', exportControlled: true }
        ]
      },
      {
        id: 'license-quantum-lab',
        publicBuyerRef: 'buyer-ref:quantum-lab',
        customerType: 'institutional-license',
        jurisdiction: 'permitted-region',
        restrictedPartyMatch: false,
        paymentRailAvailable: true,
        amountUsd: 64000,
        packages: [
          { entitlement: 'institutional-license', exportControlled: false },
          { entitlement: 'ai-compute-bundle', exportControlled: true }
        ]
      },
      {
        id: 'license-field-consortium',
        publicBuyerRef: 'buyer-ref:field-consortium',
        customerType: 'academic-consortium',
        jurisdiction: 'permitted-region',
        restrictedPartyMatch: false,
        paymentRailAvailable: false,
        exportClearanceId: 'clearance-field-2026',
        amountUsd: 18000,
        packages: [
          { entitlement: 'institutional-license', exportControlled: false },
          { entitlement: 'analytics-api-export', exportControlled: false }
        ]
      },
      {
        id: 'license-open-neuro',
        publicBuyerRef: 'buyer-ref:open-neuro',
        customerType: 'university',
        jurisdiction: 'permitted-region',
        restrictedPartyMatch: false,
        paymentRailAvailable: true,
        exportClearanceId: 'clearance-open-neuro-2026',
        amountUsd: 24000,
        packages: [
          { entitlement: 'institutional-license', exportControlled: false },
          { entitlement: 'ai-compute-bundle', exportControlled: false },
          { entitlement: 'analytics-api-export', exportControlled: false }
        ]
      }
    ]
  };
}

module.exports = {
  evaluateEligibility,
  buildSampleInstitutionalBatch,
  digest
};
