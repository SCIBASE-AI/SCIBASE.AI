import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCitation,
  buildDashboard,
  buildExportBundle,
  buildManifest,
  buildMergeRequestSummary,
  createCommit,
  demoRepository,
  diffFiles,
  runReproducibilityCheck
} from "../src/repository-core.js";

test("builds a structured scientific repository manifest", () => {
  const manifest = buildManifest(demoRepository);

  assert.equal(manifest.repositoryId, demoRepository.id);
  assert.ok(manifest.components.manuscript.fileCount >= 1);
  assert.ok(manifest.components.data.fileCount >= 1);
  assert.ok(manifest.files.every((file) => file.hash.length === 64));
  assert.match(manifest.doi, /10\.5555\/scibase/);
});

test("creates immutable commits and appends them to a branch", () => {
  const { repository, commit } = createCommit(demoRepository, {
    message: "Add validation notes",
    author: "Alice Chen",
    changes: { "manuscript/validation.md": "Validation cohort details." }
  });

  assert.ok(commit.id.startsWith("commit-"));
  assert.equal(repository.branches.main.at(-1), commit.id);
  assert.equal(repository.files["manuscript/validation.md"], "Validation cohort details.");
  assert.deepEqual(commit.changedFiles, ["manuscript/validation.md"]);
});

test("produces text diffs and merge request summaries", () => {
  const diff = diffFiles("a\nb\n", "a\nc\n");
  const mr = buildMergeRequestSummary(demoRepository);

  assert.deepEqual(diff.map((hunk) => hunk.type), ["remove", "add"]);
  assert.equal(mr.status, "open");
  assert.ok(mr.diffs.some((item) => item.type === "notebook-aware"));
});

test("runs reproducibility checks and generates citations and export metadata", () => {
  const reproducibility = runReproducibilityCheck(demoRepository);
  const citation = buildCitation(demoRepository, "BibTeX");
  const bundle = buildExportBundle(demoRepository);
  const dashboard = buildDashboard(demoRepository);

  assert.equal(reproducibility.status, "passed");
  assert.match(citation, /^@dataset/);
  assert.ok(bundle.includedComponents.includes("code"));
  assert.equal(dashboard.exportBundle.fileName, bundle.fileName);
});
