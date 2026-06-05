const test = require('node:test');
const assert = require('node:assert');
const { validateIPCompliance } = require('../src/index.js');

test('IP Management Compliance Guard Tests', async (t) => {
  await t.test('Should pass when IP transfer strategy is valid open with open license', () => {
    const payload = {
      ipTransferStrategy: "open",
      license: "MIT",
      transferAuthorization: null
    };
    const result = validateIPCompliance(payload);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.issues.length, 0);
  });

  await t.test('Should fail when IP transfer strategy is open but license is proprietary', () => {
    const payload = {
      ipTransferStrategy: "open",
      license: "Proprietary Commercial",
      transferAuthorization: null
    };
    const result = validateIPCompliance(payload);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.issues.length, 1);
    assert.match(result.issues[0], /Proprietary license not allowed under 'open' strategy/);
  });

  await t.test('Should fail when IP transfer strategy is sponsored but transfer authorization is missing', () => {
    const payload = {
      ipTransferStrategy: "sponsored",
      license: "MIT",
      transferAuthorization: false
    };
    const result = validateIPCompliance(payload);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.issues.length, 1);
    assert.match(result.issues[0], /Missing transferAuthorization for 'sponsored' strategy/);
  });

  await t.test('Should fail when payload has unsupported IP strategy', () => {
    const payload = {
      ipTransferStrategy: "unknown",
      license: "MIT"
    };
    const result = validateIPCompliance(payload);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.issues.length, 1);
    assert.match(result.issues[0], /Unsupported ipTransferStrategy/);
  });
});
