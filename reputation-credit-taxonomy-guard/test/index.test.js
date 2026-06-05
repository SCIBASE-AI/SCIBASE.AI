const test = require('node:test');
const assert = require('node:assert');
const { validateCreditTaxonomy } = require('../src/index.js');

test('Reputation Credit Taxonomy Guard Tests', async (t) => {
  await t.test('Should pass for valid CRediT roles', () => {
    const payload = {
      contributors: [
        { name: "Alice", roles: ["Conceptualization", "Writing - original draft"] },
        { name: "Bob", roles: ["Formal analysis", "Software"] }
      ]
    };
    const result = validateCreditTaxonomy(payload);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.issues.length, 0);
  });

  await t.test('Should fail for invalid custom roles', () => {
    const payload = {
      contributors: [
        { name: "Charlie", roles: ["Lead Hacker", "Software"] }
      ]
    };
    const result = validateCreditTaxonomy(payload);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.issues.length, 1);
    assert.match(result.issues[0], /Invalid CRediT role/);
  });

  await t.test('Should fail if payload has no contributors', () => {
    const payload = {};
    const result = validateCreditTaxonomy(payload);
    assert.strictEqual(result.valid, false);
  });
});
