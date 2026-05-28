const assert = require('assert');
const {
  evaluateEligibility,
  buildSampleInstitutionalBatch
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testRestrictedPartyBlocksActivationAndInvoice() {
  const result = evaluateEligibility(buildSampleInstitutionalBatch());
  const decision = byId(result.customerDecisions, 'license-cryo-bio-east');

  assert.equal(decision.decision, 'compliance-hold');
  assert.ok(decision.flags.includes('restricted-party-match'));
  assert.ok(decision.flags.includes('restricted-jurisdiction'));

  const action = byId(result.revenueActions, 'hold-license-cryo-bio-east');
  assert.equal(action.invoiceAction, 'hold-invoice');
  assert.deepEqual(action.blockedEntitlements, [
    'institutional-license',
    'ai-compute-bundle',
    'analytics-api-export'
  ]);
}

function testExportControlledPackageRequiresManualClearance() {
  const result = evaluateEligibility(buildSampleInstitutionalBatch());
  const decision = byId(result.customerDecisions, 'license-quantum-lab');

  assert.equal(decision.decision, 'compliance-hold');
  assert.ok(decision.flags.includes('export-controlled-compute'));
  assert.ok(decision.flags.includes('missing-export-clearance'));

  const task = byId(result.complianceTasks, 'task-license-quantum-lab');
  assert.equal(task.priority, 'high');
  assert.equal(task.requiredAction, 'collect-export-clearance-before-revenue-activation');
}

function testPaymentRailGapRoutesInstitutionalInvoiceWithoutActivation() {
  const result = evaluateEligibility(buildSampleInstitutionalBatch());
  const decision = byId(result.customerDecisions, 'license-field-consortium');

  assert.equal(decision.decision, 'manual-billing-review');
  assert.ok(decision.flags.includes('payment-rail-unavailable'));

  const action = byId(result.revenueActions, 'review-license-field-consortium');
  assert.equal(action.invoiceAction, 'manual-review');
  assert.equal(action.entitlementAction, 'defer-activation');
}

function testEligibleCustomerCanActivateRevenue() {
  const result = evaluateEligibility(buildSampleInstitutionalBatch());
  const decision = byId(result.customerDecisions, 'license-open-neuro');

  assert.equal(decision.decision, 'activate-revenue');
  assert.deepEqual(decision.flags, []);

  const action = byId(result.revenueActions, 'activate-license-open-neuro');
  assert.equal(action.invoiceAction, 'issue-invoice');
  assert.equal(action.entitlementAction, 'activate-entitlements');
  assert.equal(action.recognizableAmountUsd, 24000);
}

function testPrivateBuyerIdentifiersAreRedacted() {
  const result = evaluateEligibility(buildSampleInstitutionalBatch());
  const serialized = JSON.stringify(result);

  assert.ok(serialized.includes('buyer-ref:cryo-bio-east'));
  assert.ok(!serialized.includes('procurement@cryo.example'));
  assert.ok(!serialized.includes('tax-id-998877'));
}

function testAuditDigestAndSummaryAreDeterministic() {
  const first = evaluateEligibility(buildSampleInstitutionalBatch());
  const second = evaluateEligibility(buildSampleInstitutionalBatch());

  assert.equal(first.summary.totalRequests, 4);
  assert.equal(first.summary.complianceHolds, 2);
  assert.equal(first.summary.manualReviews, 1);
  assert.equal(first.summary.recognizableRevenueUsd, 24000);
  assert.equal(first.auditPacket.auditDigest, second.auditPacket.auditDigest);
  assert.ok(first.auditPacket.auditDigest.startsWith('sha256:'));
}

const tests = [
  testRestrictedPartyBlocksActivationAndInvoice,
  testExportControlledPackageRequiresManualClearance,
  testPaymentRailGapRoutesInstitutionalInvoiceWithoutActivation,
  testEligibleCustomerCanActivateRevenue,
  testPrivateBuyerIdentifiersAreRedacted,
  testAuditDigestAndSummaryAreDeterministic
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} institutional sanctions export guard tests passed`);
