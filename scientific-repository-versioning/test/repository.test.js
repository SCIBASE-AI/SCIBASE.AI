import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCitationRecord,
  buildDiffPlan,
  buildMergeRequest,
  buildRepositoryExport,
  buildRepositoryManifest,
  buildReproducibilityReport,
  buildVersionGraph,
  createForkRecord,
  hashContent
} from "../src/repository.js";
import { sampleRepository } from "../src/sample-data.js";

test("repository manifest contains all required scientific components and hashes", () => {
  const manifest = buildRepositoryManifest(sampleRepository);

  assert.equal(manifest.complete, true);
  assert.equal(manifest.missingRequiredTypes.length, 0);
  assert.ok(manifest.components.every((component) => component.hash.startsWith("sha256:")));
});

test("hash content is deterministic", () => {
  assert.equal(hashContent("same-content"), hashContent("same-content"));
  assert.notEqual(hashContent("same-content"), hashContent("different-content"));
});

test("version graph models commits, branches, tags, and rollback targets", () => {
  const graph = buildVersionGraph(sampleRepository);

  assert.equal(graph.commits.length, 3);
  assert.equal(graph.branches.find((branch) => branch.name === "main").head, "c3");
  assert.equal(graph.tags[0].semanticVersion, "1.0.0");
  assert.ok(graph.rollbackTargets.some((target) => target.commit === "c2"));
});

test("fork records preserve upstream attribution", () => {
  const fork = createForkRecord(sampleRepository, {
    forkId: "fork-qc-thresholds",
    ownerId: "user-mateo",
    reason: "Explore QC threshold sensitivity"
  });

  assert.equal(fork.upstreamRepositoryId, sampleRepository.id);
  assert.deepEqual(fork.attribution, sampleRepository.authors);
  assert.equal(fork.createdFromCommit, "c3");
});

test("merge request becomes mergeable when approved and checks pass", () => {
  const mr = buildMergeRequest(sampleRepository, sampleRepository.mergeRequest);

  assert.equal(mr.mergeable, true);
  assert.equal(mr.reviewState, "approved");
  assert.equal(mr.checkState, "passed");
});

test("diff plan selects scientific editor and diff modes", () => {
  const diffPlan = buildDiffPlan(sampleRepository);

  assert.ok(diffPlan.some((entry) => entry.editor === "jupyter" && entry.diff === "notebook-cell"));
  assert.ok(diffPlan.some((entry) => entry.editor === "markdown"));
  assert.ok(diffPlan.some((entry) => entry.lfs === true && entry.diff === "hash-only"));
});

test("reproducibility report and export are ready", () => {
  const report = buildReproducibilityReport(sampleRepository);
  const exported = buildRepositoryExport(sampleRepository);

  assert.equal(report.status, "ready");
  assert.equal(exported.exportReady, true);
  assert.match(exported.archiveName, /repo-organoid-response/);
});

test("citation record produces DOI, APA, and BibTeX outputs", () => {
  const citation = buildCitationRecord(sampleRepository);

  assert.match(citation.doi, /10\.0000\/scibase/);
  assert.match(citation.apa, /Organoid perturbation response atlas/);
  assert.match(citation.bibtex, /@dataset/);
});
