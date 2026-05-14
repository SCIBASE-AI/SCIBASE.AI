'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sample = require('../data/sample-manuscript.json');
const {
  buildBibliography,
  buildCitationReport,
  buildCrossReferenceReport,
  buildPublicationPackage,
  collectCitationOrder,
  extractCitationKeys,
  formatReference,
  loadReferences,
  normalizeDoi,
  parseAuthors,
  parseBibtex,
} = require('../src/reference-workbench');

test('BibTeX parser normalizes keys, authors, titles, and DOI URLs', () => {
  const references = parseBibtex(sample.bibtex);
  const park = references.find((reference) => reference.key === 'park2024');

  assert.equal(references.length, 3);
  assert.equal(park.title, 'Versioned Cytokine Panels in Longitudinal Studies');
  assert.equal(park.authors[0].family, 'Park');
  assert.equal(park.doi, '10.4444/clm.2024.88');
});

test('author parsing supports BibTeX family-given and plain names', () => {
  const authors = parseAuthors('Curie, Marie and Ada Lovelace');

  assert.deepEqual(authors.map((author) => author.family), ['Curie', 'Lovelace']);
  assert.deepEqual(authors.map((author) => author.given), ['Marie', 'Ada']);
});

test('citation extraction supports markdown citations and LaTeX cite commands', () => {
  const keys = extractCitationKeys('A [@one; @two] B \\cite{three,four}; C \\citet{five}; D \\citep{six}.');

  assert.deepEqual(keys, ['one', 'two', 'three', 'four', 'five', 'six']);
});

test('citation report preserves first-use order and detects missing citations', () => {
  const manuscript = {
    ...sample,
    sections: [
      ...sample.sections,
      { id: 'discussion', heading: 'Discussion', body: 'Missing evidence [@does-not-exist].' },
    ],
  };
  const references = loadReferences(sample);
  const report = buildCitationReport(manuscript, references, 'nature');

  assert.deepEqual(report.citationOrder.slice(0, 4), ['ortiz2025', 'park2024', 'dataset-immune-7', 'scibase2026']);
  assert.deepEqual(report.missing, ['does-not-exist']);
  assert.equal(report.labels.park2024, '[2]');
});

test('bibliography renders style-specific entries', () => {
  const references = loadReferences(sample);
  const citationOrder = collectCitationOrder(sample);
  const nature = buildBibliography(references, citationOrder, 'nature');
  const apa = buildBibliography(references, citationOrder, 'apa');
  const apaOrtiz = apa.find((entry) => entry.key === 'ortiz2025');

  assert.match(nature[0].text, /^1\. Ortiz L\., Chen M\./);
  assert.match(apaOrtiz.text, /Ortiz, L\. & Chen, M\. \(2025\)/);
});

test('cross-reference report resolves figures, tables, and equations', () => {
  const report = buildCrossReferenceReport(sample);

  assert.equal(report.unresolved.length, 0);
  assert.ok(report.resolved.some((entry) => entry.replacement === 'Figure 1'));
  assert.ok(report.resolved.some((entry) => entry.replacement === 'Equation 1'));
  assert.ok(report.resolved.some((entry) => entry.replacement === 'Table 1'));
});

test('publication package is ready when references and cross-references resolve', () => {
  const pkg = buildPublicationPackage(sample, { style: 'nature' });

  assert.equal(pkg.readiness.ready, true);
  assert.equal(pkg.readiness.blockers.length, 0);
  assert.ok(pkg.readiness.warnings.some((warning) => warning.includes('scibase2026')));
  assert.equal(pkg.exportPlan.hasLatexBlocks, true);
  assert.equal(pkg.exportPlan.digest.length, 64);
});

test('publication package blocks unresolved citation and cross-reference markers', () => {
  const manuscript = {
    ...sample,
    sections: [
      { id: 'broken', heading: 'Broken', body: 'Bad cite [@missing] and bad marker {{fig:missing}}.' },
    ],
  };
  const pkg = buildPublicationPackage(manuscript, { style: 'vancouver' });

  assert.equal(pkg.readiness.ready, false);
  assert.ok(pkg.readiness.blockers.some((blocker) => blocker.includes('missing')));
});

test('reference formatter handles DOI normalization and Vancouver numbering', () => {
  const reference = loadReferences(sample)[1];

  assert.equal(normalizeDoi('https://doi.org/10.1234/ABC.'), '10.1234/abc');
  assert.match(formatReference(reference, 'vancouver', 2), /^2\. Park M\., Alvarez D\./);
});
