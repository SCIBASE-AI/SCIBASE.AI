const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateReferenceLibraryMerge,
  buildReferenceMergePacket,
} = require('./index');

test('holds manuscript export when merged reference libraries contain duplicate identifiers, key collisions, stale citations, and locked edits', () => {
  const result = evaluateReferenceLibraryMerge({
    generatedAt: '2026-05-22T16:10:00Z',
    manuscriptId: 'collab-editor-neuro-042',
    libraryRevision: 'refs-r17',
    references: [
      {
        id: 'zotero-a1',
        source: 'zotero',
        citationKey: 'Nguyen2026Atlas',
        doi: '10.1101/2026.04.01.123456',
        title: 'Single-cell atlas for glial repair',
        authors: ['Nguyen T', 'Patel R'],
        year: 2026,
      },
      {
        id: 'bibtex-b9',
        source: 'bibtex',
        citationKey: 'Nguyen2026Atlas',
        doi: 'https://doi.org/10.1101/2026.04.01.123456',
        title: 'Duplicated preprint import',
        authors: ['Nguyen T'],
        year: 2026,
      },
      {
        id: 'endnote-locked',
        source: 'endnote',
        citationKey: 'Smith2024Methods',
        doi: '10.7554/elife.12345',
        title: 'Locked method source',
        authors: ['Smith A'],
        year: 2024,
        locked: true,
      },
    ],
    citations: [
      {anchorId: 'sec-results-p4-c2', citationKey: 'Nguyen2026Atlas', sectionId: 'results'},
      {anchorId: 'sec-discussion-p2-c1', citationKey: 'Missing2023Trial', sectionId: 'discussion'},
    ],
    proposedEdits: [
      {referenceId: 'endnote-locked', changedFields: ['title', 'doi'], editor: 'orcid:0000-0002-2222-3333'},
    ],
    actionsRequested: ['sync-reference-library', 'export-manuscript', 'notify-collaborators'],
  });

  assert.equal(result.decision, 'hold-export');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    [
      'duplicate-source-identifier',
      'citation-key-collision',
      'stale-citation-anchor',
      'locked-reference-edit',
    ]
  );
  assert.equal(result.summary.blockingFindingCount, 4);
  assert.deepEqual(result.gatedActions.sort(), ['export-manuscript', 'sync-reference-library']);
  assert.deepEqual(result.visibleActions, ['notify-collaborators']);
  assert.match(result.remediationPlan[0].reason, /10.1101\/2026.04.01.123456/);
});

test('routes unresolved reference conflicts and incomplete source metadata to merge review', () => {
  const result = evaluateReferenceLibraryMerge({
    generatedAt: '2026-05-22T16:20:00Z',
    manuscriptId: 'collab-editor-ecology-019',
    libraryRevision: 'refs-r08',
    references: [
      {
        id: 'zotero-fieldnote',
        source: 'zotero',
        citationKey: 'Lopez2025FieldNote',
        title: 'Longitudinal field notebook appendix',
        authors: ['Lopez M'],
        year: 2025,
        conflict: true,
      },
      {
        id: 'bibtex-dataset',
        source: 'bibtex',
        citationKey: 'RiverData2024',
        doi: '10.5281/zenodo.424242',
        title: 'River sensor dataset',
        authors: ['Data Consortium'],
        year: 2024,
      },
    ],
    citations: [
      {anchorId: 'sec-methods-p1-c1', citationKey: 'Lopez2025FieldNote', sectionId: 'methods'},
      {anchorId: 'sec-data-p3-c1', citationKey: 'RiverData2024', sectionId: 'data'},
    ],
    actionsRequested: ['sync-reference-library', 'export-manuscript', 'notify-collaborators'],
  });

  assert.equal(result.decision, 'merge-review');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['missing-source-metadata', 'unresolved-reference-conflict']
  );
  assert.equal(result.summary.reviewFindingCount, 2);
  assert.deepEqual(result.gatedActions, ['export-manuscript']);
  assert.deepEqual(result.visibleActions.sort(), ['notify-collaborators', 'sync-reference-library']);
});

test('approves clean reference merges and builds a reviewer packet', () => {
  const result = evaluateReferenceLibraryMerge({
    generatedAt: '2026-05-22T16:30:00Z',
    manuscriptId: 'collab-editor-physics-007',
    libraryRevision: 'refs-r22',
    references: [
      {
        id: 'zotero-quantum',
        source: 'zotero',
        citationKey: 'Chen2026Quantum',
        doi: '10.1038/s41586-026-11111-1',
        title: 'Quantum sensor calibration',
        authors: ['Chen L', 'Ibrahim N'],
        year: 2026,
      },
      {
        id: 'bibtex-control',
        source: 'bibtex',
        citationKey: 'Patel2024Controls',
        pmid: '39555123',
        title: 'Control experiment checklist',
        authors: ['Patel R'],
        year: 2024,
      },
    ],
    citations: [
      {anchorId: 'sec-intro-p2-c1', citationKey: 'Chen2026Quantum', sectionId: 'intro'},
      {anchorId: 'sec-methods-p4-c1', citationKey: 'Patel2024Controls', sectionId: 'methods'},
    ],
    actionsRequested: ['sync-reference-library', 'export-manuscript', 'notify-collaborators'],
  });
  const packet = buildReferenceMergePacket(result);

  assert.equal(result.decision, 'export-ready');
  assert.equal(result.summary.findingCount, 0);
  assert.deepEqual(result.gatedActions, []);
  assert.deepEqual(result.visibleActions.sort(), ['export-manuscript', 'notify-collaborators', 'sync-reference-library']);
  assert.match(packet, /collab-editor-physics-007/);
  assert.match(packet, /No remediation required/);
});
