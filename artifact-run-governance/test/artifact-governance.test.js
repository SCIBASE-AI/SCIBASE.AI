import assert from "node:assert/strict";
import test from "node:test";
import { artifactWorkspace } from "../src/sample-data.js";
import {
  buildExportDecisions,
  buildGovernancePacket,
  buildRetentionPolicy,
  buildStorageManifest,
  classifyArtifact,
  clone,
  evaluateAccessGates,
  evaluateComputeTriggers,
  evaluateEnvironmentReadiness,
  summarizeVersionDiffs,
} from "../src/artifact-governance.js";
import { createServer } from "../src/server.js";

test("classifies datasets, notebooks, models, and environments", () => {
  const byId = new Map(artifactWorkspace.artifacts.map((artifact) => [artifact.id, classifyArtifact(artifact)]));

  assert.equal(byId.get("artifact-response-csv").kind, "dataset");
  assert.equal(byId.get("artifact-analysis-notebook").kind, "notebook");
  assert.equal(byId.get("artifact-model-weights").kind, "model");
  assert.equal(byId.get("artifact-dockerfile").kind, "environment");
});

test("builds storage manifest with large object counts and previews", () => {
  const manifest = buildStorageManifest(artifactWorkspace);

  assert.equal(manifest.artifactCount, artifactWorkspace.artifacts.length);
  assert.ok(manifest.largeFileCount >= 2);
  assert.ok(manifest.artifacts.some((artifact) => artifact.preview === "tabular-preview"));
  assert.match(manifest.manifestHash, /^sha256:/);
});

test("quarantines sensitive raw artifacts and warns on model cards", () => {
  const gates = evaluateAccessGates(artifactWorkspace);

  assert.ok(gates.some((gate) => gate.artifactId === "artifact-raw-instrument" && gate.decision === "quarantine"));
  assert.ok(gates.some((gate) => gate.artifactId === "artifact-model-weights" && gate.warnings.includes("model-card-missing")));
});

test("summarizes dataset and notebook version diffs", () => {
  const diffs = summarizeVersionDiffs(artifactWorkspace);

  assert.equal(diffs.length, 2);
  assert.ok(diffs.some((diff) => diff.artifactId === "artifact-response-csv" && diff.impact === "high"));
  assert.ok(diffs.every((diff) => diff.evidenceHash.startsWith("sha256:")));
});

test("flags executable environment hardening gaps", () => {
  const environment = evaluateEnvironmentReadiness(artifactWorkspace);

  assert.equal(environment.status, "needs-hardening");
  assert.ok(environment.warnings.includes("environment-dependencies-not-pinned"));
});

test("blocks compute triggers requiring quarantined artifacts", () => {
  const triggers = evaluateComputeTriggers(artifactWorkspace);

  assert.ok(triggers.some((trigger) => trigger.triggerId === "trigger-reproduce-results" && trigger.decision === "needs-review"));
  assert.ok(triggers.some((trigger) => trigger.triggerId === "trigger-weekly-rerun" && trigger.decision === "blocked"));
});

test("builds export decisions that redact disallowed artifacts", () => {
  const exports = buildExportDecisions(artifactWorkspace);
  const publicZip = exports.find((item) => item.targetId === "target-public-zip");

  assert.ok(publicZip.excluded.some((item) => item.artifactId === "artifact-raw-instrument"));
  assert.equal(publicZip.decision, "redacted-export");
});

test("builds retention policy with controlled raw data retention", () => {
  const retention = buildRetentionPolicy(artifactWorkspace);
  const raw = retention.find((item) => item.artifactId === "artifact-raw-instrument");

  assert.equal(raw.retentionDays, 2555);
  assert.equal(raw.storageTier, "large-object-store");
});

test("builds full governance packet", () => {
  const packet = buildGovernancePacket(artifactWorkspace);

  assert.equal(packet.packetVersion, "artifact-run-governance/v0.1");
  assert.equal(packet.manifest.artifactCount, artifactWorkspace.artifacts.length);
  assert.ok(packet.computeTriggers.length > 0);
  assert.match(packet.auditHash, /^sha256:/);
});

test("API factory uses injected workspace data", async () => {
  const workspace = clone(artifactWorkspace);
  workspace.id = "custom-workspace";

  const server = createServer(workspace);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/governance-packet`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.workspaceId, "custom-workspace");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
