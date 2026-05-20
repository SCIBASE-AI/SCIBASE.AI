"use strict";

const assert = require("assert");
const { createLicenseCompatibilityPacket, evaluateArtifact, ruleFor } = require("./index");
const { releaseManifest } = require("./sample-data");

function runTests() {
  assert.strictEqual(ruleFor("MIT").commercial, true);
  assert.strictEqual(ruleFor("CC-BY-NC-4.0").commercial, false);

  const packet = createLicenseCompatibilityPacket(releaseManifest);
  assert.strictEqual(packet.releaseStatus, "blocked", "sample release should be blocked by incompatible artifacts");
  assert(packet.blockedArtifacts.includes("supp-001"), "non-commercial supplement should be blocked");
  assert(packet.blockedArtifacts.includes("code-002"), "GPL helper should be blocked under Apache target");
  assert(packet.readyArtifacts.includes("code-001"), "MIT code should be release-ready");

  const supplement = evaluateArtifact(releaseManifest.artifacts[3], releaseManifest);
  assert(supplement.holds.includes("commercial-use-blocked"), "NC license must block commercial release");
  assert(supplement.holds.includes("missing-attribution"), "missing attribution must be held");
}

if (require.main === module) {
  runTests();
  console.log("artifact license compatibility tests passed");
}

module.exports = { runTests };
