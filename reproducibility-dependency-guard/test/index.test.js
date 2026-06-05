const test = require('node:test');
const assert = require('node:assert');
const { validateReproducibility } = require('../src/index.js');

test('Reproducibility Dependency Guard Tests', async (t) => {
  await t.test('Should pass when exact versions are provided', () => {
    const payload = {
      manifest: {
        dependencies: {
          "numpy": "1.26.4",
          "pandas": "2.2.1"
        }
      }
    };
    const result = validateReproducibility(payload);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.issues.length, 0);
  });

  await t.test('Should fail when caret (^) versions are used', () => {
    const payload = {
      manifest: {
        dependencies: {
          "numpy": "^1.26.4",
          "pandas": "2.2.1"
        }
      }
    };
    const result = validateReproducibility(payload);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.issues.length, 1);
    assert.match(result.issues[0], /Non-deterministic version/);
  });

  await t.test('Should fail when tilde (~) versions are used', () => {
    const payload = {
      manifest: {
        dependencies: {
          "numpy": "1.26.4",
          "pandas": "~2.2.1"
        }
      }
    };
    const result = validateReproducibility(payload);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.issues.length, 1);
    assert.match(result.issues[0], /Non-deterministic version/);
  });

  await t.test('Should fail when payload has no manifest', () => {
    const payload = {};
    const result = validateReproducibility(payload);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.issues.length, 1);
    assert.match(result.issues[0], /Missing manifest/);
  });
});
