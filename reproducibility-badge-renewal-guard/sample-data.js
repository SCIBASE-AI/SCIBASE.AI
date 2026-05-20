'use strict';

const candidates = [
  {
    userId: 'researcher-ada',
    projectId: 'project-folding-graph',
    badgeId: 'badge-reproducible-gold',
    authorInstitutions: ['Northbridge Lab'],
    expectedHashes: {
      data: 'sha256:data111',
      code: 'sha256:code111',
      environment: 'sha256:env111',
    },
    observedHashes: {
      data: 'sha256:data111',
      code: 'sha256:code111',
      environment: 'sha256:env111',
    },
    reruns: [
      {
        id: 'rerun-001',
        verifierId: 'reviewer-marie',
        verifierInstitution: 'Curie Institute',
        status: 'passed',
        verifiedAt: '2026-04-20T00:00:00.000Z',
      },
      {
        id: 'rerun-002',
        verifierId: 'reviewer-grace',
        verifierInstitution: 'Lovelace Center',
        status: 'passed',
        verifiedAt: '2026-04-21T00:00:00.000Z',
      },
    ],
    signals: {},
  },
  {
    userId: 'researcher-bohr',
    projectId: 'project-benchmark-split',
    badgeId: 'badge-reproducible-silver',
    authorInstitutions: ['Northbridge Lab'],
    expectedHashes: {
      data: 'sha256:data222',
      code: 'sha256:code222',
      environment: 'sha256:env222',
    },
    observedHashes: {
      data: 'sha256:data222',
      code: 'sha256:code-drift',
      environment: 'sha256:env222',
    },
    reruns: [
      {
        id: 'rerun-003',
        verifierId: 'researcher-bohr',
        verifierInstitution: 'Northbridge Lab',
        status: 'passed',
        verifiedAt: '2026-03-15T00:00:00.000Z',
      },
      {
        id: 'rerun-004',
        verifierId: 'reviewer-hopper',
        verifierInstitution: 'Independent Methods Group',
        status: 'failed',
        verifiedAt: '2026-03-16T00:00:00.000Z',
      },
    ],
    signals: {
      majorCorrection: 'Correction updates benchmark split generation script.',
      openAppeal: 'appeal-778',
    },
  },
  {
    userId: 'researcher-curie',
    projectId: 'project-wetlab-validation',
    badgeId: 'badge-reproducible-bronze',
    authorInstitutions: ['Radium Lab'],
    expectedHashes: {
      data: 'sha256:data333',
      code: 'sha256:code333',
      environment: 'sha256:env333',
    },
    observedHashes: {
      data: 'sha256:data333',
      code: 'sha256:code333',
      environment: 'sha256:env333',
    },
    reruns: [
      {
        id: 'rerun-005',
        verifierId: 'reviewer-noether',
        verifierInstitution: 'Algebra Institute',
        status: 'passed',
        verifiedAt: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 'rerun-006',
        verifierId: 'reviewer-franklin',
        verifierInstitution: 'Rosalind Center',
        status: 'passed',
        verifiedAt: '2026-02-03T00:00:00.000Z',
      },
    ],
    signals: {
      retractionNotice: 'Retraction notice on validation dataset.',
    },
  },
];

const cleanCandidates = [candidates[0]];
const checkedAt = '2026-05-20T00:00:00.000Z';

module.exports = {
  candidates,
  cleanCandidates,
  checkedAt,
};
