'use strict';

const assert = require('assert');
const {
  evaluateInvoice,
  evaluatePortfolio,
  getAgingBucket,
  getOutstandingCents
} = require('./index');

const asOfDate = '2026-05-22';

function invoice(overrides) {
  return Object.assign({
    id: 'INV-100',
    customer: 'North Valley Research Office',
    currency: 'USD',
    issueDate: '2026-02-10',
    dueDate: '2026-03-10',
    amountCents: 500000,
    deliveryAccepted: true,
    activeResearch: false,
    payments: [],
    disputes: [],
    promisedPays: [],
    financeContacts: [
      { name: 'A. Finance', email: 'finance@example.edu', verified: true },
      { name: 'B. Grants', email: 'grants@example.edu', verified: true }
    ],
    dunningHistory: []
  }, overrides || {});
}

function testOverdueCollectionsEscalation() {
  const packet = evaluateInvoice(invoice({ activeResearch: true }), { asOfDate });

  assert.equal(packet.agingBucket, '61-90');
  assert.equal(packet.action, 'collections_escalation_packet');
  assert.equal(packet.severity, 'high');
  assert.match(packet.entitlementTreatment, /soft hold/);
  assert.ok(packet.nextSteps.includes('apply non-disruptive soft hold to new billable usage'));
  assert.equal(packet.outstandingCents, 500000);
  assert.equal(packet.auditDigest.length, 64);
}

function testDisputeBlocksCollections() {
  const packet = evaluateInvoice(invoice({
    id: 'INV-DISPUTE',
    disputes: [{ type: 'purchase_order_mismatch', status: 'open' }]
  }), { asOfDate });

  assert.equal(packet.action, 'route_to_dispute_owner');
  assert.equal(packet.severity, 'medium');
  assert.match(packet.reason, /dispute blocks collections/);
  assert.match(packet.entitlementTreatment, /Freeze dunning|freeze dunning/i);
}

function testPromiseToPayPausesDunning() {
  const packet = evaluateInvoice(invoice({
    id: 'INV-PROMISE',
    promisedPays: [
      {
        date: '2026-05-28',
        amountCents: 350000,
        evidenceId: 'email-2026-05-21-controller'
      }
    ]
  }), { asOfDate });

  assert.equal(packet.action, 'pause_dunning_for_promised_pay');
  assert.equal(packet.validPromise.evidenceId, 'email-2026-05-21-controller');
  assert.equal(packet.severity, 'low');
}

function testPartialPaymentsAndAging() {
  const sample = invoice({
    id: 'INV-PARTIAL',
    dueDate: '2026-04-20',
    amountCents: 900000,
    payments: [
      { date: '2026-04-28', amountCents: 250000, status: 'posted' },
      { date: '2026-05-02', amountCents: 100000, status: 'failed' }
    ]
  });

  assert.equal(getOutstandingCents(sample), 650000);
  assert.equal(getAgingBucket(32, 650000), '31-60');

  const packet = evaluateInvoice(sample, { asOfDate });
  assert.equal(packet.outstandingCents, 650000);
  assert.equal(packet.agingBucket, '31-60');
  assert.equal(packet.action, 'finance_owner_escalation');
}

function testMissingAcceptanceBlocksDunning() {
  const packet = evaluateInvoice(invoice({
    id: 'INV-NO-ACCEPT',
    deliveryAccepted: false
  }), { asOfDate });

  assert.equal(packet.action, 'hold_collections_missing_acceptance');
  assert.equal(packet.severity, 'medium');
  assert.match(packet.reason, /acceptance evidence is missing/);
}

function testPortfolioSummary() {
  const portfolio = evaluatePortfolio([
    invoice({ id: 'INV-A', amountCents: 100000 }),
    invoice({ id: 'INV-B', amountCents: 200000, payments: [{ date: '2026-03-05', amountCents: 200000, status: 'posted' }] }),
    invoice({ id: 'INV-C', dueDate: '2026-05-10', amountCents: 300000 })
  ], { asOfDate });

  assert.equal(portfolio.invoiceCount, 3);
  assert.equal(portfolio.outstandingCents, 400000);
  assert.equal(portfolio.byBucket.settled, 0);
  assert.equal(portfolio.byBucket['61-90'], 100000);
  assert.equal(portfolio.byBucket['1-30'], 300000);
  assert.ok(portfolio.highRiskInvoices.includes('INV-A'));
  assert.equal(portfolio.auditDigest.length, 64);
}

const tests = [
  testOverdueCollectionsEscalation,
  testDisputeBlocksCollections,
  testPromiseToPayPausesDunning,
  testPartialPaymentsAndAging,
  testMissingAcceptanceBlocksDunning,
  testPortfolioSummary
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} institutional invoice collections guard tests passed`);
