'use strict';

const assert = require('node:assert/strict');
const sampleData = require('./sample-data.json');
const { evaluateCitationWatch, createWatchEvent, digest } = require('./src/citation-retraction-watch');

const plan = evaluateCitationWatch(sampleData);

assert.equal(plan.summary.claimsEvaluated, 4);
assert.equal(plan.summary.blockedCitations, 2);
assert.equal(plan.summary.correctionNotes, 1);
assert.equal(plan.summary.status, 'block_until_citations_replaced');

const retractedAction = plan.actions.find((action) => action.type === 'replace_retracted_citation');
assert.equal(retractedAction.claimId, 'claim-crispr-safety');
assert.equal(retractedAction.severity, 'critical');
assert.equal(retractedAction.replacementDoi, '10.5555/validated-crispr-2025');

const concernAction = plan.actions.find((action) => action.type === 'replace_expression_of_concern');
assert.equal(concernAction.claimId, 'claim-reproducible-models');
assert.equal(concernAction.severity, 'high');
assert.equal(concernAction.replacementDoi, '10.5555/reproducibility-manifest-2025');

const correctionInsertion = plan.insertionPlan.insertions.find((insertion) => insertion.claimId === 'claim-protein-folding');
assert.equal(correctionInsertion.noteRequired, true);
assert.equal(correctionInsertion.blocked, false);

const clearInsertion = plan.insertionPlan.insertions.find((insertion) => insertion.claimId === 'claim-open-review');
assert.equal(clearInsertion.status, 'clear');
assert.equal(clearInsertion.recommendedDoi, '10.5555/open-review-metrics-2024');

assert.equal(plan.watchEvents.length, 3);
assert.match(plan.auditDigest, /^sha256:[a-f0-9]{64}$/);

const eventA = createWatchEvent('citation.demo', { doi: '10.5555/demo', flags: ['b', 'a'] }, '2026-05-16T00:00:00.000Z');
const eventB = createWatchEvent('citation.demo', { flags: ['b', 'a'], doi: '10.5555/demo' }, '2026-05-16T00:00:00.000Z');
assert.equal(eventA.digest, eventB.digest);
assert.match(digest(plan.actions), /^sha256:[a-f0-9]{64}$/);

const clearPlan = evaluateCitationWatch({
  manuscript: sampleData.manuscript,
  claims: [sampleData.claims.find((claim) => claim.id === 'claim-open-review')],
  citationCatalog: sampleData.citationCatalog,
  watchSignals: []
});
assert.equal(clearPlan.summary.status, 'clear');
assert.equal(clearPlan.actions.length, 0);
assert.equal(clearPlan.watchEvents.length, 0);

console.log('ai-citation-retraction-watch tests passed');
console.log(`Status: ${plan.summary.status}`);
console.log(`Actions: ${plan.actions.length}`);
console.log(`Audit digest: ${plan.auditDigest}`);
