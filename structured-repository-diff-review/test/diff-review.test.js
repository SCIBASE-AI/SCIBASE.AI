import assert from "node:assert/strict";
import test from "node:test";
import { sampleRepository } from "../src/sample-data.js";
import {
  buildComponentManifest,
  buildExportBundle,
  buildReproducibilityPlan,
  buildReviewPacket,
  buildRollbackPlan,
  clone,
  compareRepositoryVersions,
  diffCsvComponent,
  diffJsonComponent,
  diffNotebookComponent,
  evaluateSemanticImpact,
} from "../src/diff-review.js";
import { createServer } from "../src/server.js";

const csvComponent = sampleRepository.components.find((component) => component.format === "csv");
const jsonComponent = sampleRepository.components.find((component) => component.format === "json");
const notebookComponent = sampleRepository.components.find((component) => component.format === "ipynb");

test("builds a manifest that covers required scientific repository directories", () => {
  const manifest = buildComponentManifest(sampleRepository);

  assert.equal(manifest.missingRequiredDirectories.length, 0);
  assert.equal(manifest.requiredComponentGaps.length, 0);
  assert.equal(manifest.componentCount, 7);
  assert.ok(manifest.components.some((component) => component.path === "results/figure-2-synergy.png" && component.lfsCandidate));
  assert.match(manifest.manifestHash, /^sha256:/);
});

test("manifest reports missing metadata component separately from directories", () => {
  const repository = clone(sampleRepository);
  repository.components = repository.components.filter((component) => component.path !== "metadata.json");

  const manifest = buildComponentManifest(repository);
  assert.deepEqual(manifest.requiredComponentGaps, ["metadata.json"]);
});

test("detects structured CSV schema, row, and cell changes", () => {
  const diff = diffCsvComponent(csvComponent);

  assert.deepEqual(diff.addedColumns, ["synergy_score"]);
  assert.equal(diff.summary.addedRowCount, 1);
  assert.equal(diff.summary.removedRowCount, 1);
  assert.equal(diff.summary.modifiedRowCount, 2);
  assert.ok(diff.modifiedRows.some((row) => row.key === "ORG-001" && row.cells.some((cell) => cell.column === "ic50_um")));
});

test("detects citation-sensitive JSON metadata changes", () => {
  const diff = diffJsonComponent(jsonComponent);

  assert.ok(diff.summary.changeCount > 0);
  assert.ok(diff.summary.citationSensitiveCount > 0);
  assert.ok(diff.citationSensitive.some((change) => change.path.startsWith("$.authors")));
});

test("detects notebook cell additions, source edits, and reorder changes", () => {
  const diff = diffNotebookComponent(notebookComponent);

  assert.equal(diff.summary.addedCellCount, 1);
  assert.equal(diff.summary.codeTouchCount, 2);
  assert.ok(diff.modifiedCells.some((cell) => cell.id === "cell-model" && cell.changes.includes("source")));
  assert.ok(diff.reorderedCells.some((cell) => cell.id === "cell-model"));
});

test("compares repository versions with a stable diff hash", () => {
  const comparison = compareRepositoryVersions(sampleRepository);

  assert.equal(comparison.repositoryId, sampleRepository.id);
  assert.equal(comparison.componentDiffs.length, sampleRepository.components.length);
  assert.match(comparison.diffHash, /^sha256:/);
});

test("impact scoring requires schema, notebook, and citation review actions", () => {
  const impact = evaluateSemanticImpact(sampleRepository);

  assert.equal(impact.level, "high");
  assert.ok(impact.requiredActions.includes("approve-schema-change"));
  assert.ok(impact.requiredActions.includes("rerun-notebook-pipeline"));
  assert.ok(impact.requiredActions.includes("refresh-citation-metadata"));
});

test("reproducibility plan flags target versions that have not been rerun", () => {
  const plan = buildReproducibilityPlan(sampleRepository);

  assert.equal(plan.status, "needs-run");
  assert.ok(plan.warnings.includes("target-version-not-yet-reproduced"));
  assert.equal(plan.blockers.length, 0);
  assert.ok(plan.commands.some((command) => command.includes("nbconvert")));
});

test("reproducibility plan warns when changed data lacks schema validation", () => {
  const repository = clone(sampleRepository);
  repository.reproducibility.commands = repository.reproducibility.commands.filter((command) => !command.includes("validate_schema"));

  const plan = buildReproducibilityPlan(repository);
  assert.ok(plan.warnings.includes("data-changed-without-schema-validation-command"));
});

test("rollback plan restores changed content and citation metadata", () => {
  const rollback = buildRollbackPlan(sampleRepository);

  assert.equal(rollback.fromVersion, "preprint-v1.2.0");
  assert.equal(rollback.toVersion, "preprint-v1.1.0");
  assert.ok(rollback.actions.some((action) => action.path === "metadata.json" && action.action === "rebuild-citation-badge"));
  assert.match(rollback.rollbackHash, /^sha256:/);
});

test("review packet and export bundle include audit-ready evidence", () => {
  const packet = buildReviewPacket(sampleRepository);
  const bundle = buildExportBundle(sampleRepository);

  assert.equal(packet.decision, "needs-reproducibility-review");
  assert.equal(bundle.packet.auditHash, packet.auditHash);
  assert.ok(bundle.includes.includes("structured-diff.json"));
  assert.ok(bundle.restRoutes.includes("/api/review"));
  assert.match(bundle.exportHash, /^sha256:/);
});

test("API factory uses injected repository data", async () => {
  const repository = clone(sampleRepository);
  repository.id = "repo-custom-diff";
  repository.title = "Custom diff review";

  const server = createServer(repository);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/review`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.repositoryId, "repo-custom-diff");
    assert.equal(body.title, "Custom diff review");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
