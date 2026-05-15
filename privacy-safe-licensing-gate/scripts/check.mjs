import assert from 'node:assert/strict';

import {buildLicensingReadinessReport, samplePackages} from '../src/privacy-safe-licensing-gate.mjs';

const report = buildLicensingReadinessReport(samplePackages);

assert.equal(report.summary.packageCount, 3, 'demo package count changed unexpectedly');
assert.equal(report.summary.readyCount, 2, 'expected two demo packages to be revenue-ready');
assert.equal(report.summary.holdCount, 1, 'expected one demo package to be held for privacy review');
assert.equal(report.summary.eligibleMonthlyRevenue, 6700, 'sample eligible revenue total changed unexpectedly');

for (const decision of report.decisions) {
  if (decision.status === 'ready') {
    assert.equal(decision.blockedFields.length, 0, `${decision.id} is ready despite blocked fields`);
    assert.equal(decision.recommendedHoldActions.length, 0, `${decision.id} is ready despite hold actions`);
  }
}

console.log('privacy-safe licensing gate check passed');
