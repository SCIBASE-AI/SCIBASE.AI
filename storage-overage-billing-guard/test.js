const assert = require('node:assert/strict');
const {evaluateStorageOverage, roundMoney} = require('./index');
const {storageAccounts} = require('./sample-data');

const evaluation = evaluateStorageOverage(storageAccounts);

assert.equal(evaluation.summary.accountsEvaluated, 4);
assert.equal(evaluation.summary.holdCount, 2);
assert.equal(evaluation.summary.invoiceReadyCount, 1);
assert.equal(evaluation.summary.monitorCount, 1);

const atlas = evaluation.accounts.find((account) => account.accountID === 'acct-lab-atlas');
assert.ok(atlas, 'Atlas account should be evaluated');
assert.equal(atlas.decision, 'invoice_ready');
assert.equal(atlas.overage.privateOverageGB, 345);
assert.equal(atlas.overage.artifactOverageGB, 95);
assert.equal(atlas.chargesUSD.total, roundMoney(345 * 0.21 + 95 * 0.14));

const northern = evaluation.accounts.find((account) => account.accountID === 'acct-northern-lights');
assert.ok(northern, 'Northern Lights account should be evaluated');
assert.equal(northern.decision, 'hold_for_ops_review');
assert.equal(northern.chargesUSD.unmeteredLeakage, roundMoney(74 * 0.21));
assert.ok(northern.controls.staleArtifacts.includes('artifact-northern-repro-001'));
assert.ok(northern.recommendedActions.some((action) => action.includes('attach meter tags')));

const civic = evaluation.accounts.find((account) => account.accountID === 'acct-civic-genomics');
assert.ok(civic, 'Civic Genomics account should be evaluated');
assert.equal(civic.decision, 'hold_for_ops_review');
assert.equal(civic.overage.licensedCacheOverageGB, 255);
assert.deepEqual(civic.controls.deletionHoldConflicts, ['artifact-civic-audit-run-22']);

const quantum = evaluation.accounts.find((account) => account.accountID === 'acct-quantum-field');
assert.ok(quantum, 'Quantum Field account should be evaluated');
assert.equal(quantum.decision, 'monitor');
assert.equal(quantum.chargesUSD.total, 0);

assert.equal(evaluation.summary.deletionHoldConflicts, 1);
assert.ok(evaluation.summary.monthlyRecoverableUSD > 150);
assert.equal(evaluation.summary.annualizedRecoverableUSD, roundMoney(evaluation.summary.monthlyRecoverableUSD * 12));

console.log('storage-overage-billing-guard tests passed');
