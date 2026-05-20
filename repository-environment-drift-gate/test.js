"use strict";

const assert = require("node:assert/strict");
const { baselineSnapshot, releaseCandidate } = require("./sample-data");
const {
  auditRepositoryEnvironmentDrift,
  compareComponents,
  compareEnvironment,
  generateSvgReport,
  semanticVersionImpact,
  staleRerunDays
} = require("./index");

const componentDiffs = compareComponents(baselineSnapshot, releaseCandidate);
const environmentDiffs = compareEnvironment(baselineSnapshot, releaseCandidate);
const audit = auditRepositoryEnvironmentDrift(baselineSnapshot, releaseCandidate);

assert.equal(componentDiffs.length, 5);
assert.equal(componentDiffs.find((item) => item.name === "data").largeFileMissingLfs, true);
assert.equal(componentDiffs.find((item) => item.name === "results").changed, false);

assert.ok(environmentDiffs.some((item) => item.field === "dockerfileHash" && item.severity === "high"));
assert.ok(environmentDiffs.some((item) => item.field === "condaLockHash" && item.severity === "high"));
assert.ok(environmentDiffs.some((item) => item.field === "systemPackages"));

assert.equal(staleRerunDays(releaseCandidate), 32);
assert.equal(semanticVersionImpact(componentDiffs, environmentDiffs), "major");
assert.equal(audit.releaseDecision, "quarantine-release");
assert.deepEqual(audit.blockers, [
  "large-file-not-routed-through-lfs",
  "high-severity-environment-drift",
  "stale-reproducibility-rerun",
  "low-reproducibility-confidence"
]);
assert.ok(audit.rollbackPlan.some((item) => item.action === "open-quarantine-branch"));
assert.ok(audit.reviewerTasks.some((item) => item.type === "lfs-routing"));
assert.ok(audit.reviewerTasks.some((item) => item.type === "rerun-required"));
assert.match(audit.auditDigest, /^[a-f0-9]{64}$/);
assert.ok(audit.requirementCoverage.computationAwareReproducibility.includes("staleRerunDays"));

const svg = generateSvgReport(audit);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Environment Drift Gate"));
assert.ok(svg.includes(audit.auditDigest.slice(0, 12)));

console.log("Repository environment drift gate tests passed");
