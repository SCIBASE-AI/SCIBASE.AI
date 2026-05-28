const assert = require("assert");
const { studies } = require("./sample-data");
const { reviewStudy, reviewStudies } = require("./index");

function byId(report, id) {
  return report.results.find((result) => result.studyId === id);
}

function hasFinding(result, code) {
  return result.findings.some((finding) => finding.code === code);
}

function runTests() {
  const clean = reviewStudy(studies[0]);
  assert.strictEqual(clean.decision, "reviewer-ready");
  assert.strictEqual(clean.evidenceScore, 100);
  assert.strictEqual(clean.findingCount, 0);

  const report = reviewStudies(studies);
  assert.strictEqual(report.summary.studiesReviewed, 4);
  assert.strictEqual(report.summary.reviewerReady, 1);
  assert.strictEqual(report.summary.blocked, 3);
  assert.ok(report.summary.averageEvidenceScore > 0);

  const loose = byId(report, "proteome-loose-fdr");
  assert.strictEqual(loose.decision, "block-reviewer-ready-status");
  assert.ok(hasFinding(loose, "peptide-fdr-above-threshold"));
  assert.ok(hasFinding(loose, "protein-fdr-above-threshold"));
  assert.ok(hasFinding(loose, "weak-protein-inference"));
  assert.ok(hasFinding(loose, "missing-validation-cohort"));
  assert.ok(hasFinding(loose, "missing-raw-files"));

  const ptm = byId(report, "proteome-ptm-localization-gap");
  assert.strictEqual(ptm.decision, "block-reviewer-ready-status");
  assert.ok(hasFinding(ptm, "protein-fdr-above-threshold"));
  assert.ok(hasFinding(ptm, "weak-ptm-localization"));
  assert.ok(hasFinding(ptm, "batch-control-gap"));

  const dia = byId(report, "proteome-dia-library-gap");
  assert.strictEqual(dia.decision, "block-reviewer-ready-status");
  assert.ok(hasFinding(dia, "missing-dia-library"));
  assert.ok(hasFinding(dia, "missing-raw-files"));
  assert.ok(hasFinding(dia, "missing-public-raw-accession"));

  console.log("proteomics mass-spectrometry evidence assistant tests passed");
}

runTests();
