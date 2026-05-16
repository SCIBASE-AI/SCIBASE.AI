'use strict';

const sampleData = require('./sample-data.json');
const { buildRetentionPlan } = require('./src/retention-legal-hold');

const plan = buildRetentionPlan(sampleData, { now: '2026-05-16T00:00:00.000Z' });

console.log('Enterprise retention and legal hold demo');
console.log('========================================');
console.log(`Institution: ${sampleData.institution.name}`);
console.log(`Status: ${plan.summary.status}`);
console.log(`Records evaluated: ${plan.summary.totalRecords}`);
console.log(`Actions: ${plan.summary.actions}`);
console.log(`Legal hold records: ${plan.summary.legalHoldRecords}`);
console.log(`Purge queue: ${plan.summary.purgeQueue}`);
console.log(`Export locks: ${plan.summary.exportLocks}`);
console.log('');

console.log('Top actions');
for (const action of plan.actions.slice(0, 6)) {
  console.log(`- [${action.severity}] ${action.type} -> ${action.recordId}`);
  console.log(`  Owner: ${action.owner}`);
  console.log(`  Due: ${action.dueOn}`);
  console.log(`  ${action.summary}`);
}

console.log('');
console.log('Dashboard metrics');
console.log(JSON.stringify(plan.dashboardMetrics, null, 2));

console.log('');
console.log('Export manifest digest');
console.log(plan.exportManifest.digest);
