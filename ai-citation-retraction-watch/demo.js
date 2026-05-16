'use strict';

const sampleData = require('./sample-data.json');
const { evaluateCitationWatch } = require('./src/citation-retraction-watch');

const plan = evaluateCitationWatch(sampleData);

console.log('AI citation retraction watch demo');
console.log('=================================');
console.log(`Manuscript: ${sampleData.manuscript.title}`);
console.log(`Status: ${plan.summary.status}`);
console.log(`Claims evaluated: ${plan.summary.claimsEvaluated}`);
console.log(`Citations checked: ${plan.summary.citationsChecked}`);
console.log(`Blocked citations: ${plan.summary.blockedCitations}`);
console.log(`Correction notes: ${plan.summary.correctionNotes}`);
console.log(`Replacement suggestions: ${plan.summary.replacementSuggestions}`);
console.log('');

console.log('Reviewer actions');
for (const action of plan.actions) {
  console.log(`- [${action.severity}] ${action.type} -> ${action.claimId}`);
  console.log(`  Current: ${action.currentDoi}`);
  console.log(`  Replacement: ${action.replacementDoi || 'none'}`);
  console.log(`  ${action.summary}`);
}

console.log('');
console.log('Insertion plan');
console.log(JSON.stringify(plan.insertionPlan, null, 2));

console.log('');
console.log('Audit digest');
console.log(plan.auditDigest);
