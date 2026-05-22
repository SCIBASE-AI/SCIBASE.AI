"use strict";

const assert = require("assert");
const {
  evaluateEmbargoRelease,
  renderMarkdownReport,
  renderSvgSummary,
  STATUS,
} = require("./index");
const { safeWorkspace, unsafeWorkspace } = require("./sample-data");

function hasCheck(packet, id) {
  return packet.checks.some((check) => check.id === id);
}

function testUnsafePackageBlocksRelease() {
  const packet = evaluateEmbargoRelease(unsafeWorkspace);
  assert.strictEqual(packet.status, STATUS.BLOCK);
  assert(packet.summary.blockers >= 5);
  assert(hasCheck(packet, "embargo-embargo-dataset-alpha-active"));
  assert(hasCheck(packet, "blind-review-identity-leak"));
  assert(hasCheck(packet, "artifact-supplement-lab-notes-restricted"));
  assert(hasCheck(packet, "thread-thread-private-sponsor-private-export"));
  assert(hasCheck(packet, "section-methods-version-drift"));
  assert(hasCheck(packet, "release-clock-before-not-before"));
}

function testSafePackageHasNoBlockers() {
  const packet = evaluateEmbargoRelease(safeWorkspace);
  assert.strictEqual(packet.status, STATUS.HOLD);
  assert.strictEqual(packet.summary.blockers, 0);
  assert(hasCheck(packet, "blind-review-identity-redacted"));
  assert(hasCheck(packet, "presence-snapshots-excluded"));
}

function testRedactedEmbargoedArtifactIsManifestSafe() {
  const packet = evaluateEmbargoRelease(safeWorkspace);
  const artifact = packet.safeManifest.artifacts.find((item) => item.id === "dataset-alpha");
  assert(artifact);
  assert.strictEqual(artifact.treatment, "redacted");
  assert.strictEqual(artifact.digest, "sha256:dataset-alpha-redacted");
}

function testAuthorsAreExcludedFromSafeManifest() {
  const packet = evaluateEmbargoRelease(safeWorkspace);
  assert.strictEqual(packet.safeManifest.metadata.authorsRedacted, true);
  assert.strictEqual(packet.safeManifest.metadata.affiliationsRedacted, true);
}

function testReportsIncludeActionableEvidence() {
  const packet = evaluateEmbargoRelease(unsafeWorkspace);
  const markdown = renderMarkdownReport(packet);
  const svg = renderSvgSummary(packet);
  assert(markdown.includes("Collaborative Embargo Release Guard"));
  assert(markdown.includes("blind-review-identity-leak"));
  assert(markdown.includes("Remove embargoed artifacts"));
  assert(markdown.includes("Move the release time after the not-before gate"));
  assert(svg.includes("Embargo release BLOCK"));
}

function testFingerprintIsDeterministic() {
  const first = evaluateEmbargoRelease(safeWorkspace);
  const second = evaluateEmbargoRelease(safeWorkspace);
  assert.strictEqual(first.fingerprint, second.fingerprint);
}

function run() {
  testUnsafePackageBlocksRelease();
  testSafePackageHasNoBlockers();
  testRedactedEmbargoedArtifactIsManifestSafe();
  testAuthorsAreExcludedFromSafeManifest();
  testReportsIncludeActionableEvidence();
  testFingerprintIsDeterministic();
  console.log("6 collaborative embargo release guard tests passed");
}

run();
