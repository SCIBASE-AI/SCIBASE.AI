"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  analyzePlan,
  analyzeSandboxRunPlans,
  hasPinnedImage,
  hasLockedExecution,
  unsafeMounts,
  unsafeOutputPaths,
  missingResourceCaps
} = require("../src");
const samples = require("../data/sample_sandbox_run_plans.json");

test("accepts a pinned, locked, egress-denied repository run", () => {
  const plan = samples.find((item) => item.id === "repo-release-001");
  const result = analyzePlan(plan);
  assert.equal(hasPinnedImage(plan), true);
  assert.equal(hasLockedExecution(plan), true);
  assert.equal(result.decision, "RELEASE");
  assert.equal(result.findings.length, 0);
});

test("holds open egress and host-secret exposure", () => {
  const result = analyzePlan(samples.find((item) => item.id === "repo-hold-002"));
  assert.equal(result.decision, "HOLD_MERGE");
  assert.ok(result.findings.some((item) => item.code === "SANDBOX_NETWORK_EGRESS_OPEN"));
  assert.ok(result.findings.some((item) => item.code === "SECRET_ENVIRONMENT_EXPOSED"));
  assert.ok(result.findings.some((item) => item.code === "SECRET_MOUNT_EXPOSED"));
});

test("detects unsafe mounts and workspace-escaping outputs", () => {
  const plan = samples.find((item) => item.id === "repo-hold-002");
  assert.ok(unsafeMounts(plan).length >= 2);
  assert.deepEqual(unsafeOutputPaths(plan), ["../published/model.pkl", "/tmp/raw-dump.csv"]);
});

test("routes allowlisted egress and missing lockfiles for review", () => {
  const result = analyzePlan(samples.find((item) => item.id === "repo-review-003"));
  assert.equal(result.decision, "REVIEW_MERGE");
  assert.ok(result.findings.some((item) => item.code === "SANDBOX_NETWORK_ALLOWLIST_REVIEW"));
  assert.ok(result.findings.some((item) => item.code === "EXECUTION_PROVENANCE_INCOMPLETE"));
});

test("detects privileged runtime settings and missing resource caps", () => {
  const plan = samples.find((item) => item.id === "repo-hold-002");
  const result = analyzePlan(plan);
  assert.deepEqual(missingResourceCaps(plan), ["cpu", "memoryMb", "timeoutSeconds", "artifactLimitMb"]);
  assert.ok(result.findings.some((item) => item.code === "PRIVILEGED_SANDBOX_RUNTIME"));
  assert.ok(result.findings.some((item) => item.code === "RESOURCE_CAPS_MISSING"));
});

test("holds root or host namespace execution even when egress is denied", () => {
  const result = analyzePlan(samples.find((item) => item.id === "repo-hold-004"));
  assert.equal(result.decision, "HOLD_MERGE");
  assert.ok(result.findings.some((item) => item.code === "PRIVILEGED_SANDBOX_RUNTIME"));
  assert.ok(result.findings.some((item) => item.code === "UNSAFE_HOST_OR_WRITE_MOUNT"));
});

test("aggregates sandbox run decisions", () => {
  const report = analyzeSandboxRunPlans(samples);
  assert.equal(report.totalPlans, 4);
  assert.deepEqual(report.counts, { RELEASE: 1, REVIEW_MERGE: 1, HOLD_MERGE: 2 });
});
