const packets = [
  {
    id: 'packet-hold-001',
    title: 'Unsupported Sepsis Biomarker Review',
    blindReview: true,
    assistantRun: {
      model: 'scibase-review-assistant-v0',
      promptDigest: 'prompt-8a9f31',
      generatedAt: '2026-05-31T06:55:00Z'
    },
    artifacts: [
      {
        id: 'manuscript-main',
        type: 'manuscript',
        path: 'manuscript.md',
        checksum: 'sha256-manuscript-a',
        topics: ['biomarkers', 'cohort', 'statistics']
      },
      {
        id: 'table-cohort',
        type: 'table',
        path: 'tables/cohort.csv',
        checksum: 'sha256-table-a',
        topics: ['cohort']
      }
    ],
    reviewComments: [
      {
        id: 'comment-1',
        kind: 'blocking',
        severity: 'critical',
        topic: 'statistics',
        confidence: 0.42,
        text: 'Dr. Lane says the authors fabricated samples and this should be rejected.',
        visibility: 'author',
        mentionsReviewerIdentity: true,
        containsPrivateNote: true,
        evidenceRefs: [],
        actionItems: []
      },
      {
        id: 'comment-2',
        kind: 'finding',
        severity: 'high',
        topic: 'statistics',
        confidence: 0.66,
        text: 'The survival model is invalid.',
        visibility: 'author',
        evidenceRefs: [
          {
            artifactId: 'missing-appendix',
            locator: 'Appendix S2',
            quoteDigest: null,
            strength: 'weak'
          }
        ],
        actionItems: ['Attach the survival model appendix or remove the claim.']
      }
    ]
  },
  {
    id: 'packet-revise-002',
    title: 'Incomplete Neuroimaging Review',
    blindReview: false,
    assistantRun: {
      model: 'scibase-review-assistant-v0',
      promptDigest: 'prompt-1d42bf',
      generatedAt: '2026-05-31T06:57:00Z'
    },
    artifacts: [
      {
        id: 'manuscript-main',
        type: 'manuscript',
        path: 'manuscript.md',
        checksum: 'sha256-manuscript-b',
        topics: ['neuroimaging', 'methods']
      },
      {
        id: 'figure-qc',
        type: 'figure',
        path: 'figures/qc.png',
        checksum: 'sha256-figure-b',
        topics: ['quality-control']
      }
    ],
    reviewComments: [
      {
        id: 'comment-3',
        kind: 'blocking',
        severity: 'medium',
        topic: 'methods',
        confidence: 0.58,
        text: 'The motion exclusion threshold should be explained before the manuscript is sent out.',
        visibility: 'author',
        evidenceRefs: [
          {
            artifactId: 'figure-qc',
            locator: 'Figure 2 caption',
            quoteDigest: 'quote-ff1930',
            strength: 'medium'
          }
        ],
        actionItems: []
      }
    ]
  },
  {
    id: 'packet-release-003',
    title: 'Release-Ready Materials Review',
    blindReview: true,
    assistantRun: {
      model: 'scibase-review-assistant-v0',
      promptDigest: 'prompt-e4c219',
      generatedAt: '2026-05-31T07:00:00Z'
    },
    artifacts: [
      {
        id: 'manuscript-main',
        type: 'manuscript',
        path: 'manuscript.md',
        checksum: 'sha256-manuscript-c',
        topics: ['materials', 'synthesis', 'statistics']
      },
      {
        id: 'table-yield',
        type: 'table',
        path: 'tables/yield.csv',
        checksum: 'sha256-table-c',
        topics: ['statistics']
      },
      {
        id: 'notebook-analysis',
        type: 'notebook',
        path: 'analysis/yield.ipynb',
        checksum: 'sha256-notebook-c',
        topics: ['statistics', 'reproducibility']
      }
    ],
    reviewComments: [
      {
        id: 'comment-4',
        kind: 'finding',
        severity: 'medium',
        topic: 'statistics',
        confidence: 0.88,
        text: 'The yield comparison should report confidence intervals alongside the p-value.',
        visibility: 'author',
        evidenceRefs: [
          {
            artifactId: 'table-yield',
            locator: 'Rows 8-14',
            quoteDigest: 'quote-12aa8e',
            strength: 'strong'
          },
          {
            artifactId: 'notebook-analysis',
            locator: 'Cell 11',
            quoteDigest: 'quote-91bf33',
            strength: 'strong'
          }
        ],
        actionItems: ['Add 95% confidence intervals for the primary yield comparison.']
      },
      {
        id: 'comment-5',
        kind: 'finding',
        severity: 'low',
        topic: 'synthesis',
        confidence: 0.82,
        text: 'The synthesis section should link the catalyst lot number to the supplementary table.',
        visibility: 'author',
        evidenceRefs: [
          {
            artifactId: 'manuscript-main',
            locator: 'Methods paragraph 3',
            quoteDigest: 'quote-4e1021',
            strength: 'medium'
          }
        ],
        actionItems: ['Add the catalyst lot reference to the supplementary materials link.']
      }
    ]
  }
];

module.exports = { packets };
