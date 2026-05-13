import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildArtifactManifest,
  buildComputeTriggers,
  buildHostingDashboard,
  buildMetadataExports,
  buildRunPlan,
  buildTagIndex,
  diffArtifactVersions,
  evaluateFairCompliance,
  selectPreview
} from "../src/artifacts.js";
import { artifacts, repositoryMetadata, runtime, triggers } from "../src/sample-data.js";

test("artifact manifest classifies folders, versions, hashes, and previews", () => {
  const manifest = buildArtifactManifest(artifacts);

  assert.equal(manifest.entries.length, artifacts.length);
  assert.ok(manifest.byFolder.data.includes("artifact-counts-v1"));
  assert.ok(manifest.entries.every((entry) => entry.contentHash.startsWith("sha256:")));
  assert.equal(selectPreview(artifacts[3]), "notebook-render");
});

test("dataset diff reports schema and row changes", () => {
  const diff = diffArtifactVersions(artifacts[0], artifacts[1]);

  assert.equal(diff.changed, true);
  assert.deepEqual(diff.addedColumns, ["batch"]);
  assert.equal(diff.rowDelta, 105);
});

test("metadata exports include JSON-LD, DataCite, and schema.org payloads", () => {
  const metadata = buildMetadataExports(repositoryMetadata, artifacts);

  assert.equal(metadata.jsonLd["@type"], "Dataset");
  assert.match(metadata.dataCite.identifier, /10\.0000/);
  assert.ok(metadata.schemaOrg.keywords.includes("single-cell"));
});

test("FAIR compliance checks identifiers, access, interoperability, reuse, and API", () => {
  const fair = evaluateFairCompliance(repositoryMetadata, artifacts);

  assert.equal(fair.status, "fair-ready");
  assert.equal(fair.score, 100);
  assert.ok(fair.checks.every((check) => check.passed));
});

test("tag index groups scientific tags", () => {
  const tags = buildTagIndex(artifacts);

  assert.ok(tags.instruments.includes("NovaSeq"));
  assert.ok(tags.organisms.includes("human"));
  assert.ok(tags.variables.includes("response_index"));
});

test("runtime plan and triggers model sandboxed execution", () => {
  const runPlan = buildRunPlan(runtime, artifacts);
  const triggerPlan = buildComputeTriggers(triggers, runtime);

  assert.equal(runPlan.status, "ready-to-run");
  assert.equal(runPlan.runtime.sandboxed, true);
  assert.ok(triggerPlan.some((trigger) => trigger.type === "cron" && trigger.enabled));
});

test("dashboard combines hosting workflows", () => {
  const dashboard = buildHostingDashboard({ metadata: repositoryMetadata, artifacts, runtime, triggers });

  assert.equal(dashboard.fair.status, "fair-ready");
  assert.equal(dashboard.diff.addedColumns[0], "batch");
  assert.equal(dashboard.runPlan.status, "ready-to-run");
});
