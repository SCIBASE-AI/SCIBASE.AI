import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildAssistantBrief, buildEvidenceMap, findResearchGaps, generatePeerReviewReport, normalizeProject, runReproducibilityCheck } from '../src/index.js';

const fixture = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'sample', 'assistant-fixture.json'), 'utf8'));

test('normalizes project metadata and domain template requirements', () => {
  const project = normalizeProject(fixture);
  assert.equal(project.projectId, 'project-ai-biomarker-002');
  assert.equal(project.domainTemplate.reviewerLens, 'methods and biological validity');
  assert.equal(project.manuscript.claims.length, 3);
  assert.match(project.auditHash, /^[a-f0-9]{64}$/);
});

test('maps manuscript claims to supporting evidence and weak evidence gaps', () => {
  const evidenceMap = buildEvidenceMap(fixture);
  assert.equal(evidenceMap.coverage, 0.667);
  assert.equal(evidenceMap.readyForInternalReview, false);
  const clinicalClaim = evidenceMap.weakClaims.find((claim) => claim.claimId === 'claim-clinical-readiness');
  assert.ok(clinicalClaim);
  assert.deepEqual(clinicalClaim.missingTypes, ['clinical-validation', 'ethics-approval']);
  assert.equal(evidenceMap.claims.find((claim) => claim.claimId === 'claim-panel-accuracy').supported, true);
});

test('generates adaptive peer-review findings for claim evidence alignment', () => {
  const review = generatePeerReviewReport(fixture);
  assert.equal(review.recommendation, 'revise_before_release');
  assert.ok(review.findings.some((finding) => finding.category === 'claims-vs-evidence' && finding.severity === 'high'));
  assert.match(review.summary, /findings/);
});

test('scores reproducibility readiness from environment, data, pipeline, outputs, and attempts', () => {
  const reproducibility = runReproducibilityCheck(fixture);
  assert.equal(reproducibility.status, 'reproducible');
  assert.equal(reproducibility.confidenceScore, 100);
  assert.equal(reproducibility.blockers.length, 0);
  assert.equal(reproducibility.attemptLinks.length, 1);
});

test('finds research gaps ranked by unresolved questions, replication, negative signals, and fit', () => {
  const gaps = findResearchGaps(fixture);
  assert.equal(gaps.topOpportunity.id, 'gap-spatial-microglia');
  assert.ok(gaps.topOpportunity.priorityScore > gaps.opportunities[1].priorityScore);
  assert.deepEqual(gaps.topOpportunity.rationale, ['low replication', 'unresolved questions', 'negative results/limitations available', 'matches researcher interests or lab capabilities']);
});

test('builds an assistant brief aggregating peer review, reproducibility, and research gaps', () => {
  const brief = buildAssistantBrief(fixture);
  assert.equal(brief.status, 'needs_researcher_attention');
  assert.equal(brief.evidenceCoverage, 0.667);
  assert.equal(brief.peerReviewRecommendation, 'revise_before_release');
  assert.equal(brief.reproducibilityConfidence, 100);
  assert.equal(brief.topResearchGap.id, 'gap-spatial-microglia');
  assert.ok(brief.blockers.includes('weak-claim:claim-clinical-readiness'));
});
