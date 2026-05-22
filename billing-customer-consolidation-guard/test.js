const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateBillingCustomerConsolidation,
  buildFinanceReviewPacket,
} = require('./index');

test('blocks consolidation when duplicate billing profiles disagree on legal entity identity', () => {
  const result = evaluateBillingCustomerConsolidation({
    institutionId: 'inst-northbridge',
    generatedAt: '2026-05-22T15:00:00Z',
    survivorProfileId: 'bill-northbridge-primary',
    profiles: [
      {
        id: 'bill-northbridge-primary',
        legalName: 'Northbridge University',
        taxId: 'US-12-3456789',
        currency: 'USD',
        subscriptions: [{id: 'sub-pro-01', product: 'institutional-pro', status: 'active'}],
        invoices: [{id: 'inv-100', status: 'open', balanceCents: 420000, currency: 'USD'}],
      },
      {
        id: 'bill-northbridge-lab',
        legalName: 'Northbridge Research Foundation',
        taxId: 'US-98-7654321',
        currency: 'USD',
        subscriptions: [{id: 'sub-lab-77', product: 'lab-collaboration', status: 'active'}],
        invoices: [{id: 'inv-101', status: 'paid', balanceCents: 0, currency: 'USD'}],
      },
    ],
  });

  assert.equal(result.decision, 'block-consolidation');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['legal-entity-conflict', 'open-receivable-preservation']
  );
  assert.equal(result.summary.openReceivableCents, 420000);
  assert.match(result.survivorDraft.holdReason, /legal entity/i);
});

test('routes duplicate active subscriptions and credit transfers to finance review', () => {
  const result = evaluateBillingCustomerConsolidation({
    institutionId: 'inst-riverton',
    generatedAt: '2026-05-22T15:00:00Z',
    survivorProfileId: 'bill-riverton-main',
    profiles: [
      {
        id: 'bill-riverton-main',
        legalName: 'Riverton Institute',
        taxId: 'US-22-3333333',
        currency: 'USD',
        subscriptions: [{id: 'sub-main', product: 'analytics-api', status: 'active'}],
        computeCreditLots: [{id: 'lot-main', remainingCents: 75000, expiresAt: '2026-12-31'}],
        analyticsSeats: {dashboard: 20, api: 5},
        invoices: [],
      },
      {
        id: 'bill-riverton-shadow',
        legalName: 'Riverton Institute',
        taxId: 'US-22-3333333',
        currency: 'USD',
        subscriptions: [{id: 'sub-shadow', product: 'analytics-api', status: 'active'}],
        computeCreditLots: [{id: 'lot-shadow', remainingCents: 125000, expiresAt: '2026-08-31'}],
        analyticsSeats: {dashboard: 6, api: 2},
        coupons: [{code: 'CONSORTIUM-25', active: true}],
        paymentEvidence: {verified: false},
        invoices: [{id: 'inv-shadow', status: 'open', balanceCents: 90000, currency: 'USD'}],
      },
    ],
  });

  assert.equal(result.decision, 'finance-review');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    [
      'duplicate-active-subscription',
      'credit-balance-transfer-required',
      'unverified-payment-evidence',
      'open-receivable-preservation',
    ]
  );
  assert.equal(result.summary.creditBalanceCents, 200000);
  assert.equal(result.summary.openReceivableCents, 90000);
  assert.deepEqual(result.survivorDraft.analyticsSeats, {dashboard: 26, api: 7});
  assert.deepEqual(result.survivorDraft.subscriptionIds.sort(), ['sub-main', 'sub-shadow']);
});

test('approves clean same-entity consolidation while preserving invoices and entitlements', () => {
  const result = evaluateBillingCustomerConsolidation({
    institutionId: 'inst-eastlake',
    generatedAt: '2026-05-22T15:00:00Z',
    survivorProfileId: 'bill-eastlake-main',
    profiles: [
      {
        id: 'bill-eastlake-main',
        legalName: 'Eastlake Lab',
        taxId: 'US-44-5555555',
        currency: 'USD',
        subscriptions: [{id: 'sub-eastlake-lab', product: 'lab-collaboration', status: 'active'}],
        computeCreditLots: [{id: 'lot-eastlake-a', remainingCents: 20000, expiresAt: '2026-11-30'}],
        analyticsSeats: {dashboard: 5, api: 1},
        invoices: [{id: 'inv-eastlake-paid', status: 'paid', balanceCents: 0, currency: 'USD'}],
      },
      {
        id: 'bill-eastlake-legacy',
        legalName: 'Eastlake Lab',
        taxId: 'US-44-5555555',
        currency: 'USD',
        subscriptions: [{id: 'sub-eastlake-compute', product: 'ai-compute-pack', status: 'active'}],
        computeCreditLots: [{id: 'lot-eastlake-b', remainingCents: 30000, expiresAt: '2026-10-31'}],
        analyticsSeats: {dashboard: 2, api: 0},
        invoices: [],
      },
    ],
  });
  const packet = buildFinanceReviewPacket(result);

  assert.equal(result.decision, 'ready-to-consolidate');
  assert.equal(result.findings.length, 0);
  assert.equal(result.summary.creditBalanceCents, 50000);
  assert.deepEqual(result.survivorDraft.profileIds.sort(), ['bill-eastlake-legacy', 'bill-eastlake-main']);
  assert.match(packet, /Billing Customer Consolidation Guard/);
  assert.match(packet, /ready-to-consolidate/);
  assert.match(packet, /Preserved credit balance: \$500\.00/);
});
