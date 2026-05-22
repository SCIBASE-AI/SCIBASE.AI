'use strict';

module.exports = [
  {
    repositoryId: 'repo-immunology-preprint',
    branch: 'release/preprint-v2',
    targetSurface: 'doi_snapshot',
    commitId: 'syn-commit-a1',
    artifacts: [
      {
        path: 'notebooks/immune-response-analysis.ipynb',
        kind: 'notebook',
        visibility: 'doi_snapshot',
        dataClass: 'controlled',
        sizeBytes: 420000,
        lfsPointer: false,
        signals: ['notebook_output_leak', 'credential_marker']
      },
      {
        path: 'data/raw-participant-table.csv',
        kind: 'dataset',
        visibility: 'doi_snapshot',
        dataClass: 'restricted',
        sizeBytes: 3100000,
        lfsPointer: true,
        signals: ['raw_patient_identifier', 'human_subjects_column']
      },
      {
        path: 'metadata.json',
        kind: 'metadata',
        visibility: 'doi_snapshot',
        dataClass: 'public',
        sizeBytes: 9000,
        lfsPointer: false,
        signals: []
      }
    ]
  },
  {
    repositoryId: 'repo-vision-model',
    branch: 'experiment/model-card',
    targetSurface: 'merge_request',
    commitId: 'syn-commit-b2',
    artifacts: [
      {
        path: 'results/model-weights.bin',
        kind: 'model_weights',
        visibility: 'private',
        dataClass: 'internal',
        sizeBytes: 88000000,
        lfsPointer: false,
        signals: []
      },
      {
        path: 'code/train.py',
        kind: 'code',
        visibility: 'private',
        dataClass: 'internal',
        sizeBytes: 18000,
        lfsPointer: false,
        signals: []
      }
    ]
  },
  {
    repositoryId: 'repo-clinical-protocol',
    branch: 'protocol/steward-review',
    targetSurface: 'tag',
    commitId: 'syn-commit-c3',
    artifacts: [
      {
        path: 'protocols/consent-appendix.md',
        kind: 'protocol',
        visibility: 'private',
        dataClass: 'restricted',
        sizeBytes: 25000,
        lfsPointer: false,
        signals: ['consent_form_marker']
      },
      {
        path: 'data/deidentified-summary.csv',
        kind: 'dataset',
        visibility: 'private',
        dataClass: 'controlled',
        sizeBytes: 1400000,
        lfsPointer: true,
        signals: []
      }
    ]
  },
  {
    repositoryId: 'repo-open-methods',
    branch: 'main',
    targetSurface: 'export_bundle',
    commitId: 'syn-commit-d4',
    artifacts: [
      {
        path: 'manuscript/paper.md',
        kind: 'manuscript',
        visibility: 'preprint_export',
        dataClass: 'public',
        sizeBytes: 35000,
        lfsPointer: false,
        signals: []
      },
      {
        path: 'code/analysis.py',
        kind: 'code',
        visibility: 'preprint_export',
        dataClass: 'public',
        sizeBytes: 22000,
        lfsPointer: false,
        signals: []
      },
      {
        path: 'data/aggregate-results.csv',
        kind: 'dataset',
        visibility: 'preprint_export',
        dataClass: 'public',
        sizeBytes: 1800000,
        lfsPointer: true,
        signals: []
      }
    ]
  }
];
