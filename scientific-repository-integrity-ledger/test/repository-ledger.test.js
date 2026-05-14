import assert from "node:assert/strict";
import test from "node:test";
import { handleRepositoryRequest } from "../src/api.js";
import { buildDemoReport } from "../src/demo.js";
import { forkRepository, repository } from "../src/sample-data.js";
import {
  buildContentIndex,
  buildExportBundle,
  buildForkRecord,
  buildMergeRequest,
  buildRepositoryManifest,
  createCommit,
  createSemanticTag,
  runReproducibilityChecks
} from "../src/repository-ledger.js";

test("builds complete repository manifests with content components", () => {
  const manifest = buildRepositoryManifest(repository);

  assert.equal(manifest.complete, true);
  assert.equal(manifest.components.length, 7);
  assert.equal(manifest.manifestHash.length, 64);
});

test("indexes file hashes deterministically", () => {
  const index = buildContentIndex(repository);

  assert.equal(index.length, repository.files.length);
  assert.equal(index[0].sha256.length, 64);
});

test("creates commits, semantic tags, and export bundles", () => {
  const commit = createCommit(repository, {
    message: "Update reproducibility evidence",
    author: "Ada Rivera",
    touchedPaths: ["notebooks/reproduce.ipynb"]
  });
  const tag = createSemanticTag(repository, commit, "preprint-v2");
  const bundle = buildExportBundle(repository, tag);

  assert.equal(commit.id.startsWith("commit:"), true);
  assert.equal(tag.commitId, commit.id);
  assert.equal(bundle.exportFormats.includes("bibtex"), true);
});

test("tracks fork provenance and merge-review state", () => {
  const fork = buildForkRecord(repository, forkRepository);
  const commit = createCommit(repository, {
    message: "Add cohort data",
    author: "Mina Okafor",
    touchedPaths: ["data/raw/heat-health.csv"]
  });
  const mr = buildMergeRequest(repository, "experiment/south-cohort", [commit]);

  assert.equal(fork.parentId, repository.id);
  assert.equal(mr.approvalsRequired, 2);
  assert.equal(mr.mergeable, true);
});

test("runs computation-aware reproducibility checks", () => {
  const checks = runReproducibilityChecks(repository);

  assert.equal(checks.status, "passed");
  assert.equal(checks.checks.every((check) => check.passed), true);
});

test("demo and API expose reviewer surfaces", () => {
  const report = buildDemoReport();
  const apiExport = handleRepositoryRequest("export");

  assert.equal(report.manifest.complete, true);
  assert.equal(report.mergeRequest.mergeable, true);
  assert.equal(apiExport.apiPath.includes("/exports/"), true);
});
