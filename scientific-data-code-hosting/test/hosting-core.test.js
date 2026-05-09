import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardPayload, buildMetadataBundle, buildStorageManifest, diffDatasetVersions, runExecutableEnvironment } from "../src/hosting-core.js";

test("builds storage manifest with previews and hashes", () => {
  const manifest = buildStorageManifest();

  assert.ok(manifest.supportedTypes.includes("dataset"));
  assert.ok(manifest.supportedTypes.includes("notebook"));
  assert.ok(manifest.artifacts.every((artifact) => artifact.hash.length === 64));
  assert.ok(manifest.artifacts.some((artifact) => artifact.preview.kind === "table"));
});

test("builds metadata bundle with FAIR and standards metadata", () => {
  const bundle = buildMetadataBundle();

  assert.equal(bundle.jsonLd["@context"], "https://schema.org");
  assert.equal(bundle.dataCite.identifier.identifierType, "DOI");
  assert.deepEqual(Object.values(bundle.fair), [true, true, true, true]);
  assert.ok(bundle.tags.includes("organoids"));
});

test("diffs dataset versions", () => {
  const diff = diffDatasetVersions("sample,dose,response\nP001,0.1,0.83\n", "sample,dose,response\nP001,0.1,0.83\nP002,0.1,0.74\n");

  assert.deepEqual(diff.addedSamples, ["P002"]);
  assert.equal(diff.rowDelta, 1);
});

test("runs executable environments and dashboard payload", () => {
  const run = runExecutableEnvironment();
  const dashboard = buildDashboardPayload();

  assert.equal(run.status, "passed");
  assert.equal(run.sandbox.network, "disabled");
  assert.ok(dashboard.computeTriggers.some((trigger) => trigger.schedule.startsWith("cron")));
  assert.equal(dashboard.execution.reproducibilityScore, 96);
});
