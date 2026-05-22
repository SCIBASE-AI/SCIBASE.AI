const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateBiomethodsProvenance,
  buildReviewerReport,
} = require('./index');

test('holds manuscript when biospecimen source and biological context are incomplete', () => {
  const result = evaluateBiomethodsProvenance({
    manuscriptId: 'ms-organoid-drug-response',
    generatedAt: '2026-05-22T14:00:00Z',
    specimens: [
      {
        id: 'spec-1',
        label: 'patient-derived organoid line',
        organism: 'Homo sapiens',
        tissue: 'pancreatic tumor',
        source: '',
        strain: '',
        sex: '',
        age: '',
      },
    ],
    cellLines: [],
    reagents: [],
  });

  assert.equal(result.decision, 'hold-for-author-response');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    [
      'missing-specimen-source',
      'missing-specimen-context',
    ]
  );
  assert.equal(result.requiredActions.length, 2);
});

test('flags stale cell-line authentication and reagent traceability gaps', () => {
  const result = evaluateBiomethodsProvenance({
    manuscriptId: 'ms-immunoblot-screen',
    generatedAt: '2026-05-22T14:00:00Z',
    specimens: [],
    cellLines: [
      {
        id: 'cl-hek293t',
        name: 'HEK293T',
        source: 'ATCC',
        authenticatedAt: '2024-01-01T00:00:00Z',
        authenticationMethod: 'STR',
        mycoplasmaTestedAt: '',
      },
    ],
    reagents: [
      {
        id: 'ab-gapdh',
        name: 'anti-GAPDH antibody',
        type: 'antibody',
        vendor: 'ExampleBio',
        catalogNumber: 'EB-100',
        lot: '',
        rrid: '',
      },
    ],
  });

  assert.equal(result.decision, 'hold-for-author-response');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    [
      'stale-cell-line-authentication',
      'missing-mycoplasma-evidence',
      'missing-reagent-lot',
      'missing-antibody-rrid',
    ]
  );
  assert.equal(result.summary.critical, 1);
  assert.equal(result.summary.major, 3);
});

test('detects reagent batch conflicts across methods', () => {
  const result = evaluateBiomethodsProvenance({
    manuscriptId: 'ms-batch-sensitive-assay',
    generatedAt: '2026-05-22T14:00:00Z',
    specimens: [],
    cellLines: [],
    reagents: [
      {
        id: 'cytokine-a',
        name: 'IL-6 ELISA kit',
        type: 'assay-kit',
        vendor: 'ExampleBio',
        catalogNumber: 'ELISA-IL6',
        lot: 'lot-a',
        methodSection: 'Figure 2',
      },
      {
        id: 'cytokine-b',
        name: 'IL-6 ELISA kit',
        type: 'assay-kit',
        vendor: 'ExampleBio',
        catalogNumber: 'ELISA-IL6',
        lot: 'lot-b',
        methodSection: 'Figure 4',
      },
    ],
  });

  assert.equal(result.decision, 'needs-provenance-review');
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].type, 'reagent-batch-conflict');
  assert.deepEqual(result.findings[0].lots, ['lot-a', 'lot-b']);
});

test('builds ready reviewer report when biomethods provenance is complete', () => {
  const result = evaluateBiomethodsProvenance({
    manuscriptId: 'ms-complete-biomethods',
    generatedAt: '2026-05-22T14:00:00Z',
    specimens: [
      {
        id: 'mouse-cohort-a',
        label: 'treated mouse cohort',
        organism: 'Mus musculus',
        strain: 'C57BL/6J',
        sex: 'female',
        age: '10 weeks',
        source: 'Institutional animal facility',
      },
    ],
    cellLines: [
      {
        id: 'cl-a549',
        name: 'A549',
        source: 'ATCC',
        authenticatedAt: '2026-02-12T00:00:00Z',
        authenticationMethod: 'STR',
        mycoplasmaTestedAt: '2026-04-01T00:00:00Z',
      },
    ],
    reagents: [
      {
        id: 'ab-actin',
        name: 'anti-beta-actin antibody',
        type: 'antibody',
        vendor: 'ExampleBio',
        catalogNumber: 'EB-200',
        lot: 'lot-42',
        rrid: 'AB_123456',
      },
    ],
  });
  const report = buildReviewerReport(result);

  assert.equal(result.decision, 'ready-for-review');
  assert.equal(result.findings.length, 0);
  assert.match(report, /Biomethods Provenance Assistant/);
  assert.match(report, /ready-for-review/);
  assert.match(report, /No blocking biomethods provenance gaps detected/);
});
