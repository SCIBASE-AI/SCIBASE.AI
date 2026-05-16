import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildArtifactReuseLineage, validateLineageInput } from "../src/artifact-reuse-lineage.js";

const sample = JSON.parse(
  await readFile(new URL("../data/sample-lineage.json", import.meta.url), "utf8")
);

test("sample input is internally consistent", () => {
  assert.deepEqual(validateLineageInput(sample), []);
});

test("builds scored graph edges and paths", () => {
  const result = buildArtifactReuseLineage(sample);

  assert.equal(result.dashboard.nodeCount, 10);
  assert.equal(result.dashboard.edgeCount, 7);
  assert.ok(result.dashboard.pathCount >= 5);
  assert.equal(result.dashboard.nodeTypes.dataset, 2);
  assert.ok(result.edges.every((edge) => edge.confidence >= 0 && edge.confidence <= 1));
});

test("answers dataset to project and paper lineage queries", () => {
  const result = buildArtifactReuseLineage(sample);
  const datasetProjects = result.graphQueries.projectsByDataset["dataset:single-cell-atlas-v2"];
  const datasetPapers = result.graphQueries.papersByDataset["dataset:single-cell-atlas-v2"];

  assert.equal(datasetProjects[0].id, "project:immune-aging");
  assert.equal(datasetPapers[0].id, "paper:immune-aging-preprint");
  assert.deepEqual(datasetPapers[0].relationTrail, ["reuses", "supports"]);
});

test("generates recommendation explanations with evidence paths", () => {
  const result = buildArtifactReuseLineage(sample);
  const immuneRequest = result.recommendations.find(
    (request) => request.requestId === "request:immune-aging-data-reuse"
  );

  assert.ok(immuneRequest);
  assert.ok(immuneRequest.recommendations.length >= 2);
  assert.equal(immuneRequest.recommendations[0].artifactId, "dataset:single-cell-atlas-v2");
  assert.ok(immuneRequest.recommendations[0].explanation.join(" ").includes("Keyword overlap"));
  assert.ok(immuneRequest.recommendations[0].evidencePath.length > 0);
});

test("queues curator actions for weak, stale, and conflicting lineage", () => {
  const result = buildArtifactReuseLineage(sample);
  const actions = result.curatorActions.map((action) => action.action);

  assert.ok(actions.includes("resolve_checksum_mismatch"));
  assert.ok(actions.includes("refresh_stale_lineage"));
  assert.ok(actions.includes("review_lineage_evidence"));
  assert.equal(result.dashboard.readiness, "reviewable");
});

test("validation reports missing entities before graph build", () => {
  const invalid = {
    entities: [{ id: "dataset:a", type: "dataset", title: "A" }],
    reuseEvidence: [{ sourceId: "dataset:a", targetId: "project:missing", relation: "reuses" }]
  };

  assert.deepEqual(validateLineageInput(invalid), ["Missing target entity: project:missing"]);
});
