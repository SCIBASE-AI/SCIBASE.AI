const assert = require("assert");
const { manuscripts, targetStyles } = require("./sample-data");
const { reviewManuscript, reviewManuscripts } = require("./index");

function byId(report, id) {
  return report.results.find((result) => result.manuscriptId === id);
}

function hasFinding(result, code) {
  return result.findings.some((finding) => finding.code === code);
}

function runTests() {
  const clean = reviewManuscript(manuscripts[0], targetStyles);
  assert.strictEqual(clean.decision, "export-ready");
  assert.strictEqual(clean.styleScore, 100);

  const report = reviewManuscripts(manuscripts, targetStyles);
  assert.strictEqual(report.summary.manuscriptsReviewed, 4);
  assert.strictEqual(report.summary.exportReady, 1);
  assert.strictEqual(report.summary.minorStyleFixes, 1);
  assert.strictEqual(report.summary.styleRevision, 1);
  assert.strictEqual(report.summary.blocked, 1);

  const drift = byId(report, "manuscript-section-drift");
  assert.strictEqual(drift.decision, "block-export");
  assert.ok(hasFinding(drift, "section-order-drift"));
  assert.ok(hasFinding(drift, "missing-required-declaration"));
  assert.ok(hasFinding(drift, "blocking-comments-open"));
  assert.ok(hasFinding(drift, "missing-coauthor-approval"));

  const revision = byId(report, "manuscript-style-revision");
  assert.strictEqual(revision.decision, "style-revision");
  assert.ok(hasFinding(revision, "manuscript-word-limit-exceeded"));
  assert.ok(hasFinding(revision, "figure-limit-exceeded"));
  assert.ok(hasFinding(revision, "stale-notebook-output"));

  const minor = byId(report, "manuscript-minor-fixes");
  assert.strictEqual(minor.decision, "minor-style-fixes");
  assert.ok(hasFinding(minor, "abstract-word-limit-exceeded"));

  console.log("collaborative journal style guard tests passed");
}

runTests();
