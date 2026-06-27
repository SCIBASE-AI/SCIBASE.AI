import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";

import {
  evaluateLicenseRelease,
  summarizeResults,
} from "../src/licenseGuard.js";
import { markdownReport, svgSummary, writeArtifacts } from "../src/report.js";
import { samplePackets } from "../src/samplePackets.js";

const [releasePacket, reviewPacket, holdPacket] = samplePackets;

const releaseResult = evaluateLicenseRelease(releasePacket);
assert.equal(releaseResult.decision, "RELEASE");

const review = evaluateLicenseRelease(reviewPacket);
assert.equal(review.decision, "REVIEW");
assert.deepEqual(
  review.findings.map((finding) => finding.code),
  ["EARLY_ACCESS_REVIEW", "CONSENT_GAP"],
);

const hold = evaluateLicenseRelease(holdPacket);
assert.equal(hold.decision, "HOLD");
assert.ok(hold.findings.some((finding) => finding.code === "EXCLUSIVITY_CONFLICT"));
assert.ok(hold.findings.some((finding) => finding.code === "TIER_NOT_ENTITLED"));

assert.deepEqual(
  summarizeResults(samplePackets.map((packet) => evaluateLicenseRelease(packet))),
  { total: 3, release: 1, review: 1, hold: 1 },
);

const report = markdownReport([releaseResult, review, hold]);
assert.match(report, /Embargoed Data License Guard Demo/);
assert.match(report, /lic-market-rare-disease-2026/);

const svg = svgSummary([releaseResult, review, hold]);
assert.match(svg, /<svg/);
assert.match(svg, /Embargoed data license decisions/);

const artifactDir = "artifacts-test";
rmSync(artifactDir, { recursive: true, force: true });
writeArtifacts([releaseResult, review, hold], artifactDir);
assert.match(
  readFileSync(`${artifactDir}/demo-output.json`, "utf8"),
  /lic-exclusive-funder-2026/,
);
rmSync(artifactDir, { recursive: true, force: true });

console.log("license guard tests passed");
