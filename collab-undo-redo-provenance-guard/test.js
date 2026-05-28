const assert = require("assert");
const { documentState, requests } = require("./sample-data");
const { evaluateUndoRedoBatch, rangesOverlap } = require("./index");

function byId(report, id) {
  return report.results.find((result) => result.requestId === id);
}

function runTests() {
  assert.strictEqual(rangesOverlap([10, 20], [19, 30]), true);
  assert.strictEqual(rangesOverlap([10, 20], [20, 30]), false);

  const report = evaluateUndoRedoBatch(documentState, requests);
  assert.strictEqual(report.summary.requestCount, 6);

  const clean = byId(report, "req-clean-own-undo");
  assert.strictEqual(clean.decision, "allow");
  assert.strictEqual(clean.provenanceScore, 100);

  const hijack = byId(report, "req-other-author-hijack");
  assert.strictEqual(hijack.decision, "block");
  assert.ok(hijack.issues.some((issue) => issue.code === "cross-author-undo"));

  const stale = byId(report, "req-stale-range");
  assert.strictEqual(stale.decision, "block");
  assert.ok(stale.issues.some((issue) => issue.code === "stale-section-version"));
  assert.ok(stale.issues.some((issue) => issue.code === "intervening-range-conflict"));

  const notebook = byId(report, "req-locked-notebook-redo");
  assert.strictEqual(notebook.decision, "block");
  assert.ok(notebook.issues.some((issue) => issue.code === "locked-section-side-path"));
  assert.ok(notebook.issues.some((issue) => issue.code === "missing-notebook-output-snapshot"));

  const editor = byId(report, "req-editor-override");
  assert.strictEqual(editor.decision, "allow");

  const comment = byId(report, "req-comment-anchor-delete");
  assert.strictEqual(comment.decision, "block");
  assert.ok(comment.issues.some((issue) => issue.code === "protected-comment-anchor-delete"));

  console.log("undo redo provenance guard tests passed");
}

runTests();
