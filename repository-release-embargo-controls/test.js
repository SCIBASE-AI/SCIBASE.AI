"use strict";

const assert = require("node:assert/strict");
const sampleBundle = require("./sample-data.json");
const {
  analyzeRepositoryReleaseControls,
  stableHash,
} = require("./src/repository-release-embargo-controls");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byId(result) {
  return new Set(result.findings.map((finding) => finding.id));
}

const blocked = analyzeRepositoryReleaseControls(sampleBundle);
const blockedIds = byId(blocked);

assert.equal(blocked.releaseDecision, "blocked");
assert.match(blocked.auditDigest, /^sha256:[a-f0-9]{64}$/);
assert(blockedIds.has("active-embargo-window"));
assert(blockedIds.has("large-file-lfs-routing"));
assert(blockedIds.has("export-bundle-incomplete"));
assert.equal(blocked.componentManifest.length, 3);
assert.equal(blocked.releaseChecklist.find((item) => item.name === "embargo").status, "blocked");

const readyBundle = clone(sampleBundle);
readyBundle.releaseCandidate.visibility = "private";
readyBundle.releaseCandidate.exportFiles.push("checksums.sha256");
readyBundle.components[0].lfsPointer = true;

const ready = analyzeRepositoryReleaseControls(readyBundle);
assert.equal(ready.releaseDecision, "release-ready");
assert.equal(ready.findings.length, 0);
assert.equal(ready.releaseChecklist.every((item) => item.status === "passed"), true);

const failedPipelineBundle = clone(readyBundle);
failedPipelineBundle.reproducibilityRuns[1].status = "failed";
const failedPipeline = analyzeRepositoryReleaseControls(failedPipelineBundle);
assert.equal(failedPipeline.releaseDecision, "blocked");
assert(byId(failedPipeline).has("reproducibility-run-failed"));

assert.notEqual(blocked.auditDigest, ready.auditDigest);
assert.equal(stableHash({ b: 1, a: 2 }), stableHash({ a: 2, b: 1 }));

console.log("repository release embargo control tests passed");
