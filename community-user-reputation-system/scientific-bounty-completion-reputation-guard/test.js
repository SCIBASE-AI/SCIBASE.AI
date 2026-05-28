"use strict";

const assert = require("assert");
const packet = require("./fixtures/completion-packet.json");
const { reviewCompletionReputation, toMarkdown, toSvg } = require("./index");

const report = reviewCompletionReputation(packet);

assert.strictEqual(report.packetId, "SYN-BOUNTY-REP-015");
assert.strictEqual(report.status, "block-reputation-release");
assert.strictEqual(report.riskScore, 100);
assert.strictEqual(report.releaseReadiness, 0);
assert.strictEqual(report.severityCounts.critical, 1);
assert.ok(report.severityCounts.high >= 3);

const findingIds = new Set(report.findings.map((finding) => finding.id));
[
  "unfunded-settlement",
  "appeal-window-open",
  "milestone-scope-gap",
  "team-attribution-mismatch",
  "duplicate-claim-risk",
  "post-submission-scope-change"
].forEach((id) => assert.ok(findingIds.has(id), `missing expected finding ${id}`));

const markdown = toMarkdown(report);
assert.ok(markdown.includes("Scientific Bounty Reputation Review"));
assert.ok(markdown.includes("block-reputation-release"));
assert.ok(markdown.includes("funded settlement"));

const svg = toSvg(report);
assert.ok(svg.startsWith("<svg"));
assert.ok(svg.includes("Bounty completion reputation guard"));
assert.ok(svg.includes("SYN-BOUNTY-REP-015"));

console.log(`scientific bounty reputation guard tests passed (${report.findingCount} findings, risk ${report.riskScore})`);
