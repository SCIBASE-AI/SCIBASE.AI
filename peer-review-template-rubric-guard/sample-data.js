const scenarios = [
  {
    name: 'Biology fast-track template misses rubric and privacy requirements',
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
  },
  {
    name: 'Physics methods template needs reviewer declarations',
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
  },
  {
    name: 'Social-science open review template is publication ready',
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
  },
];

module.exports = {scenarios};
