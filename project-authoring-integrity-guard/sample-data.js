const bundles = [
  {
    project: {
      id: 'proj-public-genomics',
      title: 'Public Genomics Replication Workspace',
      visibility: 'private',
      publicationTarget: 'public'
    },
    authors: [
      { id: 'u-ada', name: 'Ada Rivera', orcid: '0000-0002-1111-2222', attributionConsent: true },
      { id: 'u-ben', name: 'Ben Malik', orcid: null, attributionConsent: false }
    ],
    artifacts: [
      {
        id: 'ms-main',
        type: 'manuscript',
        path: 'manuscripts/main.md',
        checksum: 'sha256:ms-current',
        sourceChecksum: 'sha256:ms-source',
        references: [{ artifactId: 'data-participant', publicDisclosureNote: false }],
        requiredDecisionIds: ['decision-release']
      },
      {
        id: 'nb-analysis',
        type: 'notebook',
        path: 'notebooks/analysis.ipynb',
        checksum: 'sha256:nb-current',
        sourceChecksum: 'sha256:nb-source',
        requiredDecisionIds: ['decision-release']
      },
      {
        id: 'code-stats',
        type: 'code',
        path: 'code/stats.py',
        checksum: 'sha256:code-current',
        sourceChecksum: 'sha256:code-source'
      },
      {
        id: 'data-participant',
        type: 'dataset',
        path: 'data/participant-derived.csv',
        checksum: 'sha256:data-current',
        restricted: true
      }
    ],
    discussionDecisions: [
      {
        id: 'decision-release',
        topic: 'Public manuscript release',
        requiredSignoffs: ['u-ada', 'u-ben'],
        signoffs: ['u-ada']
      }
    ],
    citationMetadata: {
      doi: null,
      license: 'CC-BY-4.0',
      contributors: ['u-ada', 'u-ben'],
      fundingSources: ['FUND-42'],
      institutions: ['Northbridge Lab']
    },
    reproducibilityManifest: {
      environmentPinned: false,
      notebooks: [
        {
          id: 'nb-analysis',
          executedAgainst: {
            code: [{ artifactId: 'code-stats', checksum: 'sha256:code-old' }],
            datasets: [{ artifactId: 'data-participant', checksum: 'sha256:data-old' }]
          }
        }
      ]
    }
  },
  {
    project: {
      id: 'proj-field-notes',
      title: 'Field Notes Workspace Handoff',
      visibility: 'institutional',
      publicationTarget: 'institutional'
    },
    authors: [
      { id: 'u-cam', name: 'Cam Torres', orcid: '0000-0003-3333-4444', attributionConsent: true }
    ],
    artifacts: [
      {
        id: 'ms-field',
        type: 'manuscript',
        path: 'manuscripts/field-notes.tex',
        checksum: 'sha256:field-ms',
        sourceChecksum: null,
        references: [{ artifactId: 'data-field', publicDisclosureNote: true }],
        requiredDecisionIds: ['decision-methods']
      },
      {
        id: 'data-field',
        type: 'dataset',
        path: 'data/field-observations.csv',
        checksum: 'sha256:field-data',
        restricted: false
      }
    ],
    discussionDecisions: [
      {
        id: 'decision-methods',
        topic: 'Methods wording accepted',
        requiredSignoffs: ['u-cam'],
        signoffs: ['u-cam']
      }
    ],
    citationMetadata: {
      doi: '10.5555/scibase-field-notes',
      license: null,
      contributors: ['u-cam'],
      fundingSources: [],
      institutions: ['Coastal Institute']
    },
    reproducibilityManifest: {
      environmentPinned: true,
      notebooks: []
    }
  },
  {
    project: {
      id: 'proj-clean-room',
      title: 'Clean Room Notebook Release',
      visibility: 'private',
      publicationTarget: 'public'
    },
    authors: [
      { id: 'u-dia', name: 'Dia Shah', orcid: '0000-0004-5555-6666', attributionConsent: true },
      { id: 'u-eli', name: 'Eli Park', orcid: '0000-0005-7777-8888', attributionConsent: true }
    ],
    artifacts: [
      {
        id: 'ms-clean',
        type: 'manuscript',
        path: 'manuscripts/clean-room.md',
        checksum: 'sha256:clean-ms',
        sourceChecksum: 'sha256:clean-ms-source',
        references: [{ artifactId: 'data-clean', publicDisclosureNote: true }],
        requiredDecisionIds: ['decision-clean-release']
      },
      {
        id: 'nb-clean',
        type: 'notebook',
        path: 'notebooks/clean-room.ipynb',
        checksum: 'sha256:clean-nb',
        sourceChecksum: 'sha256:clean-nb-source',
        requiredDecisionIds: ['decision-clean-release']
      },
      {
        id: 'code-clean',
        type: 'code',
        path: 'code/model.js',
        checksum: 'sha256:clean-code',
        sourceChecksum: 'sha256:clean-code-source'
      },
      {
        id: 'data-clean',
        type: 'dataset',
        path: 'data/public-synthetic.csv',
        checksum: 'sha256:clean-data',
        restricted: false
      }
    ],
    discussionDecisions: [
      {
        id: 'decision-clean-release',
        topic: 'Publish clean-room release',
        requiredSignoffs: ['u-dia', 'u-eli'],
        signoffs: ['u-dia', 'u-eli']
      }
    ],
    citationMetadata: {
      doi: '10.5555/scibase-clean-room',
      license: 'MIT',
      contributors: ['u-dia', 'u-eli'],
      fundingSources: ['OPEN-SCI-7'],
      institutions: ['Open Systems Lab']
    },
    reproducibilityManifest: {
      environmentPinned: true,
      notebooks: [
        {
          id: 'nb-clean',
          executedAgainst: {
            code: [{ artifactId: 'code-clean', checksum: 'sha256:clean-code' }],
            datasets: [{ artifactId: 'data-clean', checksum: 'sha256:clean-data' }]
          }
        }
      ]
    }
  }
];

module.exports = { bundles };
