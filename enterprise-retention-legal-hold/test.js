'use strict';

const assert = require('node:assert/strict');
const sampleData = require('./sample-data.json');
const { buildRetentionPlan, createWebhookEvent, digest } = require('./src/retention-legal-hold');

const plan = buildRetentionPlan(sampleData, { now: '2026-05-16T00:00:00.000Z' });

assert.equal(plan.summary.totalRecords, 5);
assert.equal(plan.summary.legalHoldRecords, 2);
assert.equal(plan.summary.missingPolicies, 1);
assert.equal(plan.summary.status, 'legal_hold_controls_required');

const controlledRecord = plan.evaluations.find((evaluation) => evaluation.recordId === 'rec-controlled-genomics-raw');
assert(controlledRecord.holdIds.includes('hold-irb-alpha-2026'));
assert.equal(controlledRecord.status, 'blocked');
assert(!plan.purgeQueue.some((entry) => entry.recordId === 'rec-controlled-genomics-raw'));
assert(plan.exportLocks.some((lock) => lock.recordId === 'rec-controlled-genomics-raw'));

const reviewTranscript = plan.purgeQueue.find((entry) => entry.recordId === 'rec-review-transcript-2022');
assert(reviewTranscript);
assert.equal(reviewTranscript.owner, 'Peer Review Operations');

const missingPolicyAction = plan.actions.find((action) => action.type === 'classify_retention_policy');
assert.equal(missingPolicyAction.recordId, 'rec-lab-log-unclassified');
assert.equal(missingPolicyAction.severity, 'high');

const openAccessAction = plan.actions.find((action) => action.type === 'open_access_evidence_required');
assert.equal(openAccessAction.recordId, 'rec-grant-report-eu');
assert(openAccessAction.blockers.includes('funder_final_report'));

assert.equal(plan.dashboardMetrics.byDepartment.Bioinformatics, 2);
assert.equal(plan.dashboardMetrics.byDepartment['Engineering Biology'], 1);
assert.equal(plan.dashboardMetrics.exportLocks, 2);

const eventA = createWebhookEvent('retention.demo', { recordId: 'rec-1', holds: ['h2', 'h1'] }, '2026-05-16T00:00:00.000Z');
const eventB = createWebhookEvent('retention.demo', { holds: ['h2', 'h1'], recordId: 'rec-1' }, '2026-05-16T00:00:00.000Z');
assert.equal(eventA.digest, eventB.digest);
assert.match(eventA.digest, /^sha256:[a-f0-9]{64}$/);

const manifestDigest = digest(plan.exportManifest.records);
assert.match(manifestDigest, /^sha256:[a-f0-9]{64}$/);

const clearRecord = sampleData.records.find((record) => record.id === 'rec-manuscript-draft-aging');
const clearPlan = buildRetentionPlan({
  institution: sampleData.institution,
  policies: sampleData.policies,
  records: [clearRecord],
  legalHolds: []
}, { now: '2026-05-16T00:00:00.000Z' });
assert.equal(clearPlan.summary.status, 'clear');
assert.equal(clearPlan.actions.length, 0);
assert.equal(clearPlan.dashboardMetrics.clearRecords, 1);
assert.equal(clearPlan.exportManifest.records[0].exportDecision, 'ready');

console.log('enterprise-retention-legal-hold tests passed');
console.log(`Status: ${plan.summary.status}`);
console.log(`Actions: ${plan.summary.actions}`);
console.log(`Export locks: ${plan.summary.exportLocks}`);
