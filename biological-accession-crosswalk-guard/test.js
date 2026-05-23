const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateBiologicalAccessionCrosswalk,
  buildReviewerPacket,
} = require('./index');

test('holds malformed accessions and duplicate canonical targets', () => {
  const result = evaluateBiologicalAccessionCrosswalk({
    graphId: 'kg-bio-crosswalk-risk',
    generatedAt: '2026-05-23T07:00:00Z',
    nodes: [
      {
        id: 'node-gene-tp53',
        namespace: 'NCBIGene',
        accession: '7157',
        canonicalTarget: 'NCBIGene:7157',
        taxon: '9606',
        evidenceDois: ['10.1016/j.cell.2026.01.001'],
        crosswalkConfidence: 0.98,
      },
      {
        id: 'node-gene-p53-alias',
        namespace: 'NCBIGene',
        accession: 'TP53',
        canonicalTarget: 'NCBIGene:7157',
        taxon: '9606',
        evidenceDois: ['10.1016/j.cell.2026.01.001'],
        crosswalkConfidence: 0.72,
      },
    ],
  });

  assert.equal(result.decision, 'hold-for-curation');
  assert.equal(result.summary.nodeCount, 2);
  assert.equal(result.summary.formatIssues, 1);
  assert.equal(result.summary.duplicateTargets, 1);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['invalid-accession-format', 'duplicate-canonical-target']
  );
  assert.equal(result.requiredActions[0].type, 'fix_accession_namespace');
});

test('requires review for deprecated aliases, taxon mismatch, and weak evidence', () => {
  const result = evaluateBiologicalAccessionCrosswalk({
    graphId: 'kg-bio-crosswalk-review',
    generatedAt: '2026-05-23T07:00:00Z',
    nodes: [
      {
        id: 'node-protein-old',
        namespace: 'UniProtKB',
        accession: 'Q9Y261',
        canonicalTarget: 'UniProtKB:Q9Y261',
        taxon: '10090',
        expectedTaxon: '9606',
        deprecatedAlias: true,
        evidenceDois: [],
        crosswalkConfidence: 0.61,
      },
    ],
  });

  assert.equal(result.decision, 'needs-curator-review');
  assert.equal(result.summary.aliasIssues, 1);
  assert.equal(result.summary.taxonIssues, 1);
  assert.equal(result.summary.evidenceIssues, 2);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['deprecated-accession-alias', 'taxon-mismatch', 'missing-doi-evidence', 'low-crosswalk-confidence']
  );
  assert.equal(result.requiredActions.at(-1).type, 'raise_crosswalk_confidence');
});

test('suppresses unsafe recommendations with unresolved crosswalk findings', () => {
  const result = evaluateBiologicalAccessionCrosswalk({
    graphId: 'kg-recommendation-risk',
    generatedAt: '2026-05-23T07:00:00Z',
    nodes: [
      {
        id: 'node-compound-aspirin',
        namespace: 'PubChem',
        accession: '2244',
        canonicalTarget: 'PubChem:2244',
        taxon: null,
        evidenceDois: ['10.1038/s41586-026-0001-2'],
        crosswalkConfidence: 0.97,
      },
      {
        id: 'node-mesh-bad',
        namespace: 'MeSH',
        accession: 'bad-mesh',
        canonicalTarget: 'MeSH:D001241',
        taxon: null,
        evidenceDois: ['10.1038/s41586-026-0001-2'],
        crosswalkConfidence: 0.93,
        usedInRecommendation: true,
      },
    ],
  });

  assert.equal(result.decision, 'hold-for-curation');
  assert.equal(result.summary.recommendationSuppressions, 1);
  assert.equal(result.findings[0].type, 'invalid-accession-format');
  assert.equal(result.requiredActions.at(-1).type, 'suppress_unsafe_recommendation');
});

test('approves clean crosswalks and builds deterministic reviewer packet', () => {
  const result = evaluateBiologicalAccessionCrosswalk({
    graphId: 'kg-ready-crosswalk',
    generatedAt: '2026-05-23T07:00:00Z',
    nodes: [
      {
        id: 'node-gene-brca1',
        namespace: 'NCBIGene',
        accession: '672',
        canonicalTarget: 'NCBIGene:672',
        taxon: '9606',
        expectedTaxon: '9606',
        evidenceDois: ['10.1126/science.2026.0007'],
        crosswalkConfidence: 0.99,
      },
      {
        id: 'node-protein-brca1',
        namespace: 'UniProtKB',
        accession: 'P38398',
        canonicalTarget: 'UniProtKB:P38398',
        taxon: '9606',
        expectedTaxon: '9606',
        evidenceDois: ['10.1126/science.2026.0007'],
        crosswalkConfidence: 0.97,
      },
      {
        id: 'node-mesh-breast-neoplasms',
        namespace: 'MeSH',
        accession: 'D001943',
        canonicalTarget: 'MeSH:D001943',
        evidenceDois: ['10.1126/science.2026.0007'],
        crosswalkConfidence: 0.95,
      },
    ],
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.readinessScore, 100);
  assert.equal(result.findings.length, 0);

  const packet = buildReviewerPacket(result);
  assert.match(packet, /# Biological Accession Crosswalk Guard Report/);
  assert.match(packet, /Graph: kg-ready-crosswalk/);
  assert.match(packet, /Decision: approved/);
  assert.match(packet, /Readiness score: 100/);
  assert.match(packet, /Findings: 0/);
});
