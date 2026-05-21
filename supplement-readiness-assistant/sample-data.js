const blockedSupplementPackage = {
  policy: {
    maxChecksumAgeDays: 21,
  },
  manuscript: {
    id: 'ms-supp-042',
    title: 'Adaptive single-cell perturbation screens reveal durable stress programs',
    domain: 'computational biology',
    claims: [
      {
        id: 'claim-main-effect',
        type: 'statistical',
        text: 'The adaptive perturbation arm increased durable stress-program detection by 18 percent.',
        requiredArtifacts: ['dataset-counts', 'code-analysis', 'notebook-main'],
        supplementLinks: ['dataset-counts', 'code-analysis', 'notebook-main'],
        figureRefs: ['fig-2'],
      },
      {
        id: 'claim-protocol',
        type: 'method',
        text: 'Cells were processed with the public v2.1 stimulation protocol.',
        requiredArtifacts: ['protocol-stimulation'],
        supplementLinks: ['protocol-stimulation'],
      },
      {
        id: 'claim-appendix',
        type: 'figure',
        text: 'Supplementary table S4 supports the exclusion analysis shown in Figure 4.',
        requiredArtifacts: ['supplement-table-s4', 'notebook-main'],
        supplementLinks: ['supplement-table-s4'],
        figureRefs: ['fig-4'],
      },
    ],
  },
  supplementPackage: {
    id: 'supp-v3-review',
    version: '3.0-review',
    accessMode: 'public',
    artifacts: [
      {
        id: 'dataset-counts',
        label: 'Single-cell counts matrix',
        kind: 'dataset',
        path: 'supplement/data/counts.csv',
        checksum: 'sha256:counts-2026-04-02',
        expectedChecksum: 'sha256:counts-2026-05-20',
        checksumAgeDays: 49,
        license: 'CC-BY-4.0',
        access: 'public',
        containsHumanData: true,
        deidentified: true,
        linkedClaims: ['claim-main-effect'],
        appendixRefs: ['fig-2'],
      },
      {
        id: 'code-analysis',
        label: 'Analysis scripts',
        kind: 'code',
        path: 'supplement/code/analyze.js',
        checksum: 'sha256:code-2026-05-20',
        checksumAgeDays: 1,
        license: '',
        access: 'public',
        linkedClaims: ['claim-main-effect'],
      },
      {
        id: 'notebook-main',
        label: 'Main reproducibility notebook',
        kind: 'notebook',
        path: 'supplement/notebooks/main.ipynb',
        checksum: 'sha256:notebook-2026-05-20',
        checksumAgeDays: 1,
        license: 'MIT',
        access: 'public',
        rerunnable: false,
        linkedClaims: ['claim-main-effect', 'claim-appendix'],
      },
      {
        id: 'protocol-stimulation',
        label: 'Stimulation protocol',
        kind: 'protocol',
        path: 'supplement/protocols/stimulation.md',
        checksum: 'sha256:protocol-2026-05-20',
        checksumAgeDays: 1,
        access: 'public',
        linkedClaims: ['claim-protocol'],
      },
      {
        id: 'supplement-table-s4',
        label: 'Supplementary table S4',
        kind: 'table',
        path: '',
        checksum: '',
        checksumAgeDays: 0,
        access: 'public',
        linkedClaims: ['claim-appendix'],
      },
      {
        id: 'raw-screening-notes',
        label: 'Raw screening notes',
        kind: 'dataset',
        path: 'supplement/private/raw-notes.csv',
        checksum: 'sha256:notes-2026-05-20',
        checksumAgeDays: 1,
        license: 'restricted institutional use',
        access: 'public',
        containsHumanData: true,
        deidentified: false,
        linkedClaims: [],
      },
    ],
  },
};

function buildReadySupplementPackage() {
  const clone = JSON.parse(JSON.stringify(blockedSupplementPackage));
  const artifacts = clone.supplementPackage.artifacts;
  const dataset = artifacts.find((artifact) => artifact.id === 'dataset-counts');
  const code = artifacts.find((artifact) => artifact.id === 'code-analysis');
  const notebook = artifacts.find((artifact) => artifact.id === 'notebook-main');
  const protocol = artifacts.find((artifact) => artifact.id === 'protocol-stimulation');
  const table = artifacts.find((artifact) => artifact.id === 'supplement-table-s4');
  const notes = artifacts.find((artifact) => artifact.id === 'raw-screening-notes');
  const appendixClaim = clone.manuscript.claims.find((claim) => claim.id === 'claim-appendix');

  dataset.checksum = dataset.expectedChecksum;
  dataset.checksumAgeDays = 1;
  code.license = 'MIT';
  notebook.rerunnable = true;
  notebook.appendixRefs = ['fig-4'];
  protocol.version = '2.1';
  table.path = 'supplement/tables/s4.csv';
  table.checksum = 'sha256:table-s4-2026-05-20';
  table.appendixRefs = ['fig-4'];
  notes.access = 'restricted';
  notes.deidentified = true;
  notes.linkedClaims = ['claim-protocol'];
  appendixClaim.requiredArtifacts = ['supplement-table-s4', 'notebook-main', 'dataset-counts', 'code-analysis'];
  appendixClaim.supplementLinks = ['supplement-table-s4', 'notebook-main', 'dataset-counts', 'code-analysis'];
  return clone;
}

module.exports = {
  blockedSupplementPackage,
  buildReadySupplementPackage,
};
