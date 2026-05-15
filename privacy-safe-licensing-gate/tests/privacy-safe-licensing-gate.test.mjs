import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
  buildLicensingReadinessReport,
  evaluatePackage,
  samplePackages,
  summarizeNextActions,
} from '../src/privacy-safe-licensing-gate.mjs';

test('marks aggregated anonymized analytics packages ready for licensing', () => {
  const decision = evaluatePackage(samplePackages[0]);

  assert.equal(decision.status, 'ready');
  assert.equal(decision.revenueRecognition, 'eligible');
  assert.equal(decision.estimatedMonthlyRevenue, 4200);
  assert.deepEqual(decision.blockedFields, []);
  assert.ok(decision.allowedChannels.includes('licensed-api'));
  assert.equal(decision.checks.every((check) => check.status === 'pass'), true);
});

test('holds packages that contain private content or identifiers', () => {
  const decision = evaluatePackage(samplePackages[1]);

  assert.equal(decision.status, 'hold');
  assert.equal(decision.revenueRecognition, 'blocked');
  assert.equal(decision.estimatedMonthlyRevenue, 0);
  assert.ok(decision.blockedFields.includes('raw_content'));
  assert.ok(decision.recommendedHoldActions.some((action) => action.includes('private project content')));
  assert.ok(decision.recommendedHoldActions.some((action) => action.includes('blocked fields')));
});

test('builds an aggregate readiness report with eligible revenue only', () => {
  const report = buildLicensingReadinessReport(samplePackages);

  assert.equal(report.summary.packageCount, 3);
  assert.equal(report.summary.readyCount, 2);
  assert.equal(report.summary.holdCount, 1);
  assert.equal(report.summary.eligibleMonthlyRevenue, 6700);
  assert.equal(report.decisions.filter((decision) => decision.status === 'ready').length, 2);
  assert.ok(report.nextActions.length > 0);
});

test('supports stricter institutional licensing policy overrides', () => {
  const decision = evaluatePackage(samplePackages[2], {
    minSubjectCount: 1000,
    minKAnonymity: 20,
  });

  assert.equal(decision.status, 'hold');
  assert.ok(decision.recommendedHoldActions.some((action) => action.includes('at least 1000 subjects')));
  assert.ok(decision.recommendedHoldActions.some((action) => action.includes('at least 20')));
});

test('summarizes repeated hold actions for reviewer queues', () => {
  const heldPackages = [
    {recommendedHoldActions: ['Raise consent coverage to at least 95%.', 'Extend the aggregation window to at least 7 days.']},
    {recommendedHoldActions: ['Raise consent coverage to at least 95%.']},
  ];

  assert.deepEqual(summarizeNextActions(heldPackages), [
    {action: 'Raise consent coverage to at least 95%.', count: 2},
    {action: 'Extend the aggregation window to at least 7 days.', count: 1},
  ]);
});
