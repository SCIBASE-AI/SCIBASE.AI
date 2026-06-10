const assert = require('node:assert/strict');
const { evaluateMilestone, evaluatePortfolio, renderMarkdownReport } = require('./index');
const sample = require('./sample-data.json');

const release = evaluateMilestone(sample[0]);
assert.equal(release.action, 'RELEASE_INVOICE');
assert.deepEqual(release.findings, ['ready to invoice']);

const hold = evaluateMilestone(sample[1]);
assert.equal(hold.action, 'HOLD_FOR_REVIEW');
assert.ok(hold.findings.includes('missing sponsor acceptance'));
assert.ok(hold.findings.includes('open credits must be applied before invoicing'));
assert.ok(hold.findings.includes('budget notice is only 5 days old'));

const block = evaluateMilestone(sample[2]);
assert.equal(block.action, 'BLOCK_INVOICE');
assert.ok(block.findings.includes('contract is not active'));
assert.ok(block.findings.includes('possible duplicate invoice hash'));
assert.ok(block.findings.includes('invoice currency does not match contract'));

const results = evaluatePortfolio(sample);
assert.deepEqual(results.map((result) => result.action), ['RELEASE_INVOICE', 'HOLD_FOR_REVIEW', 'BLOCK_INVOICE']);

const report = renderMarkdownReport(results);
assert.match(report, /grant-alpha/);
assert.match(report, /HOLD_FOR_REVIEW/);
assert.match(report, /possible duplicate invoice hash/);

console.log('grant milestone release guard checks passed');
