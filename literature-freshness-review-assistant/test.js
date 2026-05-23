const assert = require("assert");

const {
  evaluateFreshnessReview,
  renderMarkdown,
  renderSvg
} = require("./index");
const {
  freshnessPolicy,
  evidenceLedger,
  manuscriptPackets
} = require("./sample-data");

const report = evaluateFreshnessReview(manuscriptPackets, evidenceLedger, freshnessPolicy);

assert.strictEqual(report.aggregate.reviewedManuscripts, 2);
assert.strictEqual(report.aggregate.heldManuscripts, 1);
assert.strictEqual(report.aggregate.readyManuscripts, 1);
assert.strictEqual(report.aggregate.criticalFindings, 1);
assert.ok(report.aggregate.majorFindings >= 4);

const held = report.manuscripts.find((entry) => entry.packetId === "ms-hold-senolytic-review");
assert.ok(held);
assert.strictEqual(held.summary.status, "hold_freshness_review");
assert.ok(held.findings.some((finding) => finding.code === "NEWER_CONTRADICTORY_EVIDENCE"));
assert.ok(held.findings.some((finding) => finding.code === "MISSING_NEWER_EVIDENCE"));
assert.ok(held.findings.some((finding) => finding.code === "DATASET_VERSION_DRIFT"));
assert.ok(held.findings.some((finding) => finding.code === "BENCHMARK_VERSION_DRIFT"));
assert.ok(held.reviewerActions.length >= 4);

const ready = report.manuscripts.find((entry) => entry.packetId === "ms-ready-telemetry-review");
assert.ok(ready);
assert.strictEqual(ready.summary.status, "ready_for_review");
assert.deepStrictEqual(ready.findings.map((finding) => finding.code), ["FRESHNESS_READY"]);

const secondPass = evaluateFreshnessReview(manuscriptPackets, evidenceLedger, freshnessPolicy);
assert.strictEqual(secondPass.auditDigest, report.auditDigest);

const markdown = renderMarkdown(report);
assert.ok(markdown.includes("Literature Freshness Review Assistant"));
assert.ok(markdown.includes("NEWER_CONTRADICTORY_EVIDENCE"));

const svg = renderSvg(report);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Literature freshness review assistant"));

console.log("literature freshness review assistant tests passed");
