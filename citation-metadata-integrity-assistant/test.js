const assert = require("assert");
const { sampleCitationBatch } = require("./sample-data");
const {
  buildMetadataIntegrityReport,
  normalizeDoi,
  normalizePmcid,
  normalizeArxiv,
  tokenSimilarity,
  digest
} = require("./index");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testMalformedIdentifiersHoldInsertion() {
  const report = buildMetadataIntegrityReport(sampleCitationBatch);
  assert.strictEqual(report.decision.status, "hold");
  assert.strictEqual(report.summary.deferredReferences, 2);
  const malformedDoi = report.referenceFindings.find((finding) => finding.referenceId === "REF-003");
  assert.strictEqual(malformedDoi.status, "defer");
  assert(malformedDoi.findings.some((finding) => finding.type === "malformed_doi"));
}

function testCanonicalMetadataCorrectionsAreEmitted() {
  const report = buildMetadataIntegrityReport(sampleCitationBatch);
  const first = report.referenceFindings.find((finding) => finding.referenceId === "REF-001");
  assert.strictEqual(first.correctedMetadata.year, 2025);
  assert(first.findings.some((finding) => finding.type === "year_mismatch"));
  assert(first.findings.some((finding) => finding.type === "author_normalization"));
}

function testDuplicateGroupIsMerged() {
  const report = buildMetadataIntegrityReport(sampleCitationBatch);
  assert.strictEqual(report.duplicateGroups.length, 1);
  assert.deepStrictEqual(report.duplicateGroups[0].referenceIds, ["REF-001", "REF-002"]);
  const merged = report.insertionPlan.find((item) => item.referenceId === "REF-001");
  assert.strictEqual(merged.action, "merge_duplicate");
}

function testCleanBatchPasses() {
  const clean = clone(sampleCitationBatch);
  clean.candidateReferences = clean.canonicalRecords.map((record, index) => ({
    id: `CLEAN-${index + 1}`,
    title: record.title,
    year: record.year,
    authors: record.authors,
    doi: record.doi,
    pmcid: record.pmcid,
    arxiv: record.arxiv,
    url: record.url,
    insertContext: "Clean synthetic citation."
  }));
  const report = buildMetadataIntegrityReport(clean);
  assert.strictEqual(report.decision.status, "pass");
  assert.strictEqual(report.summary.score, 100);
  assert.strictEqual(report.actions.length, 0);
}

function testNormalizationAndDigestAreDeterministic() {
  assert.strictEqual(normalizeDoi("https://doi.org/10.5555/ABC.DEF"), "10.5555/abc.def");
  assert.strictEqual(normalizePmcid("pmc123"), "PMC123");
  assert.strictEqual(normalizeArxiv("arXiv:2503.11880v2"), "2503.11880v2");
  assert(tokenSimilarity("alpha beta gamma", "alpha beta delta") > 0.45);
  assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
}

testMalformedIdentifiersHoldInsertion();
testCanonicalMetadataCorrectionsAreEmitted();
testDuplicateGroupIsMerged();
testCleanBatchPasses();
testNormalizationAndDigestAreDeterministic();

console.log("5 citation metadata integrity assistant tests passed");
