const test = require('node:test');
const assert = require('node:assert');
const { validateWebhookSchema } = require('../src/index.js');

test('Enterprise Webhook Schema Guard Tests', async (t) => {
  await t.test('Should pass for valid payload', () => {
    const payload = {
      event_type: "project.publication",
      timestamp: "2026-06-05T12:00:00Z",
      signature: "sha256=abc123def456",
      data: { project_id: "P-001" }
    };
    const result = validateWebhookSchema(payload);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.issues.length, 0);
  });

  await t.test('Should fail for missing timestamp', () => {
    const payload = {
      event_type: "project.publication",
      signature: "sha256=abc123def456",
      data: { project_id: "P-001" }
    };
    const result = validateWebhookSchema(payload);
    assert.strictEqual(result.valid, false);
    assert.match(result.issues[0], /Missing timestamp/);
  });

  await t.test('Should fail for invalid signature format', () => {
    const payload = {
      event_type: "project.publication",
      timestamp: "2026-06-05T12:00:00Z",
      signature: "invalid-sig",
      data: { project_id: "P-001" }
    };
    const result = validateWebhookSchema(payload);
    assert.strictEqual(result.valid, false);
    assert.match(result.issues[0], /Invalid signature format/);
  });
});
