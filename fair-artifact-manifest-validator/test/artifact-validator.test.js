import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLinkedDataExports,
  checkExecutionReadiness,
  detectArtifactType,
  scoreFairCompliance,
  summarizeVersionChanges,
  validateArtifactManifest,
  validateMetadata,
} from "../src/artifact-validator.js";
import { sampleManifest } from "../src/sample-manifest.js";

test("detects supported artifact types", () => {
  assert.equal(detectArtifactType({ path: "data/results.parquet" }), "dataset");
  assert.equal(detectArtifactType({ path: "analysis/model.ipynb" }), "notebook");
  assert.equal(detectArtifactType({ path: "weights/model.onnx" }), "model");
});

test("validates complete metadata", () => {
  const metadata = validateMetadata(sampleManifest);

  assert.equal(metadata.complete, true);
  assert.deepEqual(metadata.missing, []);
});

test("reports missing metadata", () => {
  const metadata = validateMetadata({ metadata: { title: "Incomplete" }, artifacts: [] });

  assert.equal(metadata.complete, false);
  assert.ok(metadata.missing.includes("identifier"));
  assert.ok(metadata.missing.includes("license"));
});

test("summarizes version changes", () => {
  const summary = summarizeVersionChanges(sampleManifest.versionChanges);

  assert.equal(summary.totalChanged, 2);
  assert.equal(summary.summary, "1 added, 1 modified, 0 removed");
});

test("checks execution readiness against artifact paths", () => {
  const readiness = checkExecutionReadiness(sampleManifest.execution, sampleManifest.artifacts);

  assert.equal(readiness.ready, true);
  assert.equal(readiness.entryArtifact, "analysis/reproduce.py");
});

test("generates linked-data export payloads", () => {
  const exports = buildLinkedDataExports(sampleManifest);

  assert.equal(exports.jsonld["@type"], "Dataset");
  assert.equal(exports.datacite.identifier, sampleManifest.metadata.identifier);
  assert.equal(exports.schemaOrg.license, "CC-BY-4.0");
});

test("accepts complete FAIR manifest", () => {
  const report = validateArtifactManifest(sampleManifest);

  assert.equal(report.gate.status, "accepted");
  assert.equal(report.fairScore.total, 1);
  assert.equal(report.artifacts.length, 3);
});

test("blocks manifests with missing checksums or execution metadata", () => {
  const report = validateArtifactManifest({
    ...sampleManifest,
    artifacts: [{ path: "data/raw.csv", mediaType: "text/csv" }],
    execution: {},
  });

  assert.equal(report.gate.status, "blocked");
  assert.ok(report.gate.blockers.some((blocker) => blocker.includes("checksum")));
  assert.ok(report.gate.blockers.some((blocker) => blocker.includes("Execution metadata")));
});

test("scores FAIR compliance dimensions directly", () => {
  const report = validateArtifactManifest(sampleManifest);
  const score = scoreFairCompliance({
    normalized: { metadata: sampleManifest.metadata },
    metadata: report.metadata,
    artifacts: report.artifacts,
    execution: report.execution,
    linkedData: report.linkedData,
  });

  assert.equal(score.findable, 1);
  assert.equal(score.reusable, 1);
});
