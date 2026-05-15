import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComponentManifest,
  buildExportBundle,
  buildRepositoryRelease,
  createCommitRecord,
  createReleaseTag,
  diffDatasetRows,
  runReproducibilityGate,
} from "../src/index.js";
import fixture from "../sample/repository-fixture.json" with { type: "json" };

test("builds component manifests with hashes and LFS markers", () => {
  const manifest = buildComponentManifest(fixture.repository);

  assert.equal(manifest.missingComponents.length, 0);
  assert.equal(manifest.components.find((item) => item.type === "data").files[0].lfs, true);
  assert.equal(manifest.manifestHash.length, 64);
});

test("detects missing repository components", () => {
  const manifest = buildComponentManifest({
    ...fixture.repository,
    components: { manuscript: fixture.repository.components.manuscript },
  });

  assert.deepEqual(manifest.missingComponents, ["data", "code", "notebooks", "results", "protocols", "metadata"]);
});

test("creates commit records with deterministic provenance", () => {
  const first = createCommitRecord(fixture.repository, fixture.changeSet);
  const second = createCommitRecord(fixture.repository, fixture.changeSet);

  assert.equal(first.commitHash, second.commitHash);
  assert.equal(first.changedFiles.length, 2);
  assert.equal(first.provenance.contributorRole, "maintainer");
});

test("diffs structured dataset rows", () => {
  const diff = diffDatasetRows(fixture.datasetBefore, fixture.datasetAfter);

  assert.deepEqual(diff.added, ["cell-3"]);
  assert.deepEqual(diff.removed, ["cell-2"]);
  assert.deepEqual(diff.changed, ["cell-1"]);
});

test("gates releases on reproducibility and semantic tags", () => {
  const gate = runReproducibilityGate(fixture.repository, fixture.releaseOptions.reproducibilityRun);
  assert.equal(gate.status, "passed");

  const release = createReleaseTag(fixture.repository, fixture.releaseOptions);
  assert.equal(release.ready, true);
  assert.equal(release.citation.includes("10.5555/scibase.atlas.001"), true);

  assert.throws(() => createReleaseTag(fixture.repository, { version: "draft" }), /semantic/);
});

test("builds export bundles and complete release audits", () => {
  const release = buildRepositoryRelease(
    fixture.repository,
    fixture.changeSet,
    fixture.releaseOptions,
  );
  const bundle = buildExportBundle(fixture.repository, release.releaseTag);

  assert.equal(release.releaseTag.ready, true);
  assert.equal(bundle.filename, "project-atlas-001-1.0.0.zip");
  assert.equal(bundle.files.length, 7);
  assert.equal(release.auditHash.length, 64);
});
