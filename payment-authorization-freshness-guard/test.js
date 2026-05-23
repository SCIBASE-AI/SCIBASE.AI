const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluatePaymentAuthorizationFreshness,
  buildFinancePacket,
} = require('./index');

test('blocks renewal charges with expired cards and stale SCA mandates', () => {
  const result = evaluatePaymentAuthorizationFreshness({
    batchId: 'pay-auth-risk',
    generatedAt: '2026-05-23T09:30:00Z',
    chargeRequests: [
      {
        id: 'charge-renewal-expired-card',
        customerId: 'inst-alpha',
        revenueStream: 'subscription_renewal',
        amount: 12000,
        currency: 'USD',
        paymentInstrument: {
          type: 'card',
          expiresAt: '2026-04-30',
          scaAuthenticatedAt: '2025-08-01T00:00:00Z',
          scaMaxAgeDays: 180,
          autopayConsent: true,
        },
        renewalNoticeSentAt: '2026-05-10T00:00:00Z',
      },
    ],
  });

  assert.equal(result.decision, 'block-unsafe-charges');
  assert.equal(result.summary.requestsReviewed, 1);
  assert.equal(result.summary.blockedCharges, 1);
  assert.equal(result.summary.expiredInstruments, 1);
  assert.equal(result.summary.staleMandates, 1);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['expired-payment-instrument', 'stale-sca-mandate', 'unsafe-charge-release']
  );
  assert.equal(result.requiredActions[0].type, 'collect_updated_payment_method');
});

test('requires finance review when ACH authorization is missing or out of scope', () => {
  const result = evaluatePaymentAuthorizationFreshness({
    batchId: 'pay-ach-review',
    generatedAt: '2026-05-23T09:30:00Z',
    chargeRequests: [
      {
        id: 'charge-ach-topup',
        customerId: 'lab-beta',
        revenueStream: 'ai_compute_topup',
        amount: 3000,
        currency: 'USD',
        paymentInstrument: {
          type: 'ach',
          mandateSignedAt: null,
          mandateCoversStreams: ['subscription_renewal'],
          autopayConsent: true,
        },
      },
    ],
  });

  assert.equal(result.decision, 'needs-finance-review');
  assert.equal(result.summary.authorizationIssues, 2);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['missing-debit-mandate', 'mandate-scope-mismatch']
  );
  assert.equal(result.requiredActions.at(-1).type, 'update_mandate_scope');
});

test('holds amount and currency variance without customer notice', () => {
  const result = evaluatePaymentAuthorizationFreshness({
    batchId: 'pay-variance-hold',
    generatedAt: '2026-05-23T09:30:00Z',
    chargeRequests: [
      {
        id: 'charge-currency-variance',
        customerId: 'consortium-gamma',
        revenueStream: 'analytics_license',
        amount: 9800,
        currency: 'EUR',
        authorizedAmount: 7000,
        authorizedCurrency: 'USD',
        varianceThresholdPercent: 10,
        customerNoticeSentAt: null,
        paymentInstrument: {
          type: 'card',
          expiresAt: '2027-08-31',
          scaAuthenticatedAt: '2026-04-01T00:00:00Z',
          scaMaxAgeDays: 180,
          autopayConsent: true,
        },
      },
    ],
  });

  assert.equal(result.decision, 'block-unsafe-charges');
  assert.equal(result.summary.blockedCharges, 1);
  assert.equal(result.summary.varianceIssues, 2);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['amount-variance-without-notice', 'currency-variance-without-notice', 'unsafe-charge-release']
  );
  assert.equal(result.requiredActions[0].type, 'send_customer_charge_notice');
});

test('approves fresh authorizations and builds deterministic finance packet', () => {
  const result = evaluatePaymentAuthorizationFreshness({
    batchId: 'pay-auth-ready',
    generatedAt: '2026-05-23T09:30:00Z',
    chargeRequests: [
      {
        id: 'charge-ready',
        customerId: 'inst-delta',
        revenueStream: 'subscription_renewal',
        amount: 5000,
        currency: 'USD',
        authorizedAmount: 5000,
        authorizedCurrency: 'USD',
        varianceThresholdPercent: 10,
        customerNoticeSentAt: '2026-05-01T00:00:00Z',
        renewalNoticeSentAt: '2026-05-01T00:00:00Z',
        paymentInstrument: {
          type: 'card',
          expiresAt: '2027-09-30',
          scaAuthenticatedAt: '2026-05-01T00:00:00Z',
          scaMaxAgeDays: 180,
          autopayConsent: true,
        },
      },
    ],
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.authorizationScore, 100);
  assert.equal(result.findings.length, 0);

  const packet = buildFinancePacket(result);
  assert.match(packet, /# Payment Authorization Freshness Guard Report/);
  assert.match(packet, /Batch: pay-auth-ready/);
  assert.match(packet, /Decision: approved/);
  assert.match(packet, /Authorization score: 100/);
  assert.match(packet, /Findings: 0/);
});
