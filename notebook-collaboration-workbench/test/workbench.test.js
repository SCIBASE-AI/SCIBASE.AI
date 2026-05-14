import assert from "node:assert/strict";
import test from "node:test";
import { sampleNotebook } from "../src/sample-data.js";
import {
  annotateCell,
  buildNotebookPackage,
  buildReviewDashboard,
  buildVersionManifest,
  cloneNotebook,
  planExecutionQueue,
  recordExecutionSnapshot,
  validateNotebook,
} from "../src/workbench.js";

test("validates notebook schema, kernels, collaborators, and review objects", () => {
  const validation = validateNotebook(sampleNotebook);

  assert.equal(validation.valid, true);
  assert.equal(validation.counts.cells, 4);
  assert.equal(validation.counts.codeCells, 2);
  assert.equal(validation.counts.openAnnotations, 2);
});

test("execution queue flags section locks and changed cell inputs", () => {
  const plan = planExecutionQueue(sampleNotebook);

  assert.equal(plan.length, 2);
  assert.deepEqual(plan[0].reasons, ["input-hash-changed"]);
  assert.deepEqual(plan[1].reasons, ["input-hash-changed"]);
  assert.equal(plan.every((item) => item.ready === false), true);
});

test("records execution output snapshots and removes completed queued item", () => {
  const working = cloneNotebook(sampleNotebook);
  working.queuedExecutions[1].expectedInputHash = planExecutionQueue(working)[1].inputHash;

  const { notebook, snapshot } = recordExecutionSnapshot(working, "exec-002", {
    status: "ok",
    outputType: "metric",
    summary: "RMSE 2.33 with 95% CI [2.10, 2.56]",
    content: "rmse=2.33;ci_low=2.10;ci_high=2.56",
    reproducible: true,
    createdAt: "2026-05-15T00:18:00.000Z",
  });

  assert.equal(snapshot.cellId, "cell-analysis");
  assert.equal(snapshot.reproducible, true);
  assert.equal(notebook.queuedExecutions.some((execution) => execution.id === "exec-002"), false);
});

test("adds inline cell annotations with validation", () => {
  const { notebook, annotation } = annotateCell(sampleNotebook, {
    cellId: "cell-methods",
    authorId: "mika",
    severity: "warning",
    text: "Add citation for the validation window.",
    anchor: { line: 1, column: 12 },
  });

  assert.equal(annotation.status, "open");
  assert.equal(notebook.annotations.length, sampleNotebook.annotations.length + 1);
  assert.throws(
    () => annotateCell(sampleNotebook, { cellId: "missing", authorId: "mika", severity: "note", text: "x" }),
    /missing cell/,
  );
});

test("builds version manifests with deterministic cell and output hashes", () => {
  const manifest = buildVersionManifest(sampleNotebook, "Reviewer snapshot");

  assert.equal(manifest.id, "v8");
  assert.equal(manifest.cells, 4);
  assert.equal(Object.keys(manifest.cellHashes).length, 4);
  assert.equal(manifest.openReviewItems, 2);
});

test("dashboard and submission package expose review readiness evidence", () => {
  const dashboard = buildReviewDashboard(sampleNotebook);
  const pack = buildNotebookPackage(sampleNotebook);

  assert.equal(dashboard.reviewReadiness.readyForMilestone, false);
  assert.equal(dashboard.reviewReadiness.blockers.length, 1);
  assert.equal(pack.manifestVersion, "notebook-collaboration-workbench/v0.1");
  assert.equal(pack.cells.length, sampleNotebook.cells.length);
  assert.equal(pack.review.openTasks.length, 1);
});
