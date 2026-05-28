const assert = require('assert');

const {
  buildDeliveryPacket,
  reviewWebhookDeliveryReadiness
} = require('./index');

const workspace = {
  id: 'enterprise-tooling-19',
  title: 'Institutional Webhook Delivery',
  maxRetryAttempts: 5,
  maxFailureAgeMinutes: 60,
  minRecentSuccesses: 2,
  subscribers: [
    {
      id: 'sub-ready',
      ownerId: 'org-research-office',
      active: true,
      endpoint: 'https://hooks.example.edu/scibase',
      idempotencyKey: 'evt_project_ready_2026_05',
      retryPolicy: { strategy: 'exponential', maxAttempts: 5 },
      deadLetterQueue: 'dlq-enterprise-events',
      recentSuccesses: 3,
      lastFailureMinutesAgo: 12,
      failurePayload: 'delivery failed for admin@example.edu after 1 timeout'
    },
    {
      id: 'sub-risky',
      ownerId: '',
      active: true,
      endpoint: 'https://hooks.example.edu/risky',
      idempotencyKey: '',
      retryPolicy: { strategy: 'fixed', maxAttempts: 9 },
      deadLetterQueue: '',
      recentSuccesses: 0,
      lastFailureMinutesAgo: 180,
      failurePayload: 'token=secret-token-123 email risky@example.edu'
    },
    {
      id: 'sub-paused',
      ownerId: 'org-admin',
      active: false,
      endpoint: 'https://hooks.example.edu/paused',
      idempotencyKey: 'evt-paused',
      retryPolicy: { strategy: 'exponential', maxAttempts: 3 },
      deadLetterQueue: 'dlq-paused',
      recentSuccesses: 0,
      lastFailureMinutesAgo: 0,
      failurePayload: 'paused subscriber'
    }
  ]
};

const result = reviewWebhookDeliveryReadiness(workspace);

assert.strictEqual(result.readyCount, 1);
assert.strictEqual(result.holdCount, 2);
assert.ok(result.digest.startsWith('sha256:'));

const ready = result.subscriberReviews.find((review) => review.subscriberId === 'sub-ready');
assert.strictEqual(ready.decision, 'ready');
assert.deepStrictEqual(ready.holds, []);
assert.strictEqual(ready.actions.markIntegrationHealthy, true);

const risky = result.subscriberReviews.find((review) => review.subscriberId === 'sub-risky');
assert.strictEqual(risky.decision, 'hold');
assert.ok(risky.holds.includes('missing-owner'));
assert.ok(risky.holds.includes('missing-idempotency-key'));
assert.ok(risky.holds.includes('retry-strategy-not-exponential'));
assert.ok(risky.holds.includes('retry-budget-exceeds-policy'));
assert.ok(risky.holds.includes('missing-dead-letter-route'));
assert.ok(risky.holds.includes('recent-success-window-insufficient'));
assert.ok(risky.holds.includes('failure-age-exceeds-window'));
assert.strictEqual(risky.actions.markIntegrationHealthy, false);

const paused = result.subscriberReviews.find((review) => review.subscriberId === 'sub-paused');
assert.strictEqual(paused.decision, 'hold');
assert.ok(paused.holds.includes('subscriber-inactive'));

const packet = buildDeliveryPacket(workspace, result);
const serialized = JSON.stringify(packet);
assert.ok(!serialized.includes('admin@example.edu'));
assert.ok(!serialized.includes('risky@example.edu'));
assert.ok(!serialized.includes('secret-token-123'));
assert.deepStrictEqual(packet.summary, { ready: 1, hold: 2 });

console.log('enterprise-webhook-delivery-guard tests passed');
