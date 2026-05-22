const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluatePeerReviewTemplateRubric,
  buildRubricGuardPacket,
} = require('./index');

test('holds structured review templates that miss required dimensions and evidence anchors', () => {
  const result = evaluatePeerReviewTemplateRubric({
    generatedAt: '2026-05-22T17:00:00Z',
    templateId: 'tpl-biology-fast-track',
    discipline: 'biology',
    reviewedArtifactTypes: ['document', 'dataset', 'code', 'notebook'],
    visibilityMode: 'double-blind',
    dimensions: [
      {name: 'clarity', weight: 0.3, scoreScale: {min: 0, max: 10}, evidenceAnchors: ['document']},
      {name: 'novelty', weight: 0.5, scoreScale: {min: -1, max: 12}, evidenceAnchors: ['document']},
    ],
    reviewMode: {
      authorIdentityHidden: true,
      reviewerIdentityHidden: false,
      anonymousLabelPolicy: 'real-name',
    },
    reviewerDeclarations: {conflictOfInterest: true, methodExpertise: true, dataAccess: true},
    publicationTargets: ['project-timeline', 'reviewer-profile'],
    profilePacket: {includesRubricVersion: true, redactsAnonymousIdentities: false},
  });

  assert.equal(result.decision, 'hold-template');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    [
      'missing-required-rubric-dimension',
      'missing-required-rubric-dimension',
      'score-scale-out-of-bounds',
      'evidence-anchor-missing',
      'evidence-anchor-missing',
      'evidence-anchor-missing',
      'anonymous-mode-privacy-gap',
      'profile-publication-packet-incomplete',
    ]
  );
  assert.equal(result.summary.blockingFindingCount, 6);
  assert.match(result.curatorActions[0].reason, /rigor/i);
});

test('routes otherwise valid templates to curator review when reviewer declarations are incomplete', () => {
  const result = evaluatePeerReviewTemplateRubric({
    generatedAt: '2026-05-22T17:10:00Z',
    templateId: 'tpl-physics-methods',
    discipline: 'physics',
    reviewedArtifactTypes: ['document', 'code'],
    visibilityMode: 'semi-private',
    dimensions: [
      {name: 'clarity', weight: 0.25, scoreScale: {min: 1, max: 5}, evidenceAnchors: ['document']},
      {name: 'rigor', weight: 0.35, scoreScale: {min: 1, max: 5}, evidenceAnchors: ['document', 'code']},
      {name: 'novelty', weight: 0.2, scoreScale: {min: 1, max: 5}, evidenceAnchors: ['document']},
      {name: 'reproducibility', weight: 0.2, scoreScale: {min: 1, max: 5}, evidenceAnchors: ['code']},
    ],
    reviewMode: {
      authorIdentityHidden: false,
      reviewerIdentityHidden: false,
      anonymousLabelPolicy: 'visible-to-authors',
    },
    reviewerDeclarations: {conflictOfInterest: false, methodExpertise: true, dataAccess: false},
    publicationTargets: ['project-timeline'],
    profilePacket: {includesRubricVersion: true, redactsAnonymousIdentities: true},
  });

  assert.equal(result.decision, 'curator-review');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['reviewer-declaration-incomplete', 'reviewer-declaration-incomplete']
  );
  assert.equal(result.summary.reviewFindingCount, 2);
  assert.equal(result.templatePacket.profileSafe, true);
});

test('publishes complete rubric templates and builds a profile-safe review packet', () => {
  const result = evaluatePeerReviewTemplateRubric({
    generatedAt: '2026-05-22T17:20:00Z',
    templateId: 'tpl-social-science-open-review',
    discipline: 'social-sciences',
    reviewedArtifactTypes: ['document', 'dataset', 'notebook'],
    visibilityMode: 'public',
    dimensions: [
      {name: 'clarity', weight: 0.2, scoreScale: {min: 1, max: 5}, evidenceAnchors: ['document']},
      {name: 'rigor', weight: 0.35, scoreScale: {min: 1, max: 5}, evidenceAnchors: ['document', 'dataset']},
      {name: 'novelty', weight: 0.2, scoreScale: {min: 1, max: 5}, evidenceAnchors: ['document']},
      {name: 'reproducibility', weight: 0.25, scoreScale: {min: 1, max: 5}, evidenceAnchors: ['dataset', 'notebook']},
    ],
    reviewMode: {
      authorIdentityHidden: false,
      reviewerIdentityHidden: false,
      anonymousLabelPolicy: 'public-name',
    },
    reviewerDeclarations: {conflictOfInterest: true, methodExpertise: true, dataAccess: true},
    publicationTargets: ['project-timeline', 'reviewer-profile', 'citation-page'],
    profilePacket: {includesRubricVersion: true, redactsAnonymousIdentities: true},
  });
  const packet = buildRubricGuardPacket(result);

  assert.equal(result.decision, 'publish-template');
  assert.equal(result.summary.findingCount, 0);
  assert.equal(result.templatePacket.templateId, 'tpl-social-science-open-review');
  assert.equal(result.templatePacket.rubricScore, 100);
  assert.match(packet, /social-sciences/);
  assert.match(packet, /No curator action required/);
});
