"use strict";

const assert = require("node:assert/strict");
const {
  evaluateDebriefPacket,
  renderMarkdownReport,
  renderSvgSummary,
  digest
} = require("./index");
const { cleanPacket, revisionPacket, holdPacket } = require("./sample-data");

const fixedNow = "2026-06-01T09:00:00.000Z";

function codes(result) {
  return new Set(result.findings.map((finding) => finding.code));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const cleanBefore = clone(cleanPacket);
const cleanResult = evaluateDebriefPacket(cleanPacket, { now: fixedNow });
assert.equal(cleanResult.decision, "release_debrief");
assert.equal(cleanResult.releaseAllowed, true);
assert.equal(cleanResult.findings.length, 0);
assert.deepEqual(cleanPacket, cleanBefore, "evaluation must not mutate the packet");

const revisionResult = evaluateDebriefPacket(revisionPacket, { now: fixedNow });
assert.equal(revisionResult.decision, "revise_before_release");
assert.equal(revisionResult.releaseAllowed, false);
assert.equal(codes(revisionResult).has("MISSING_RUBRIC_FEEDBACK"), true);
assert.equal(codes(revisionResult).has("APPEAL_DEADLINE_MISMATCH"), true);
assert.equal(codes(revisionResult).has("UNEVEN_FEEDBACK_COVERAGE"), true);
assert.equal(codes(revisionResult).has("THIN_OR_NON_ACTIONABLE_FEEDBACK"), true);

const holdResult = evaluateDebriefPacket(holdPacket, { now: fixedNow });
assert.equal(holdResult.decision, "hold_debrief_release");
assert.equal(holdResult.releaseAllowed, false);
assert.equal(codes(holdResult).has("PRIVATE_BENCHMARK_LEAK"), true);
assert.equal(codes(holdResult).has("REVIEWER_ANONYMITY_LEAK"), true);
assert.equal(codes(holdResult).has("OTHER_TEAM_IP_LEAK"), true);
assert.equal(codes(holdResult).has("PAYMENT_NEGOTIATION_LANGUAGE"), true);

const report = renderMarkdownReport(holdResult);
assert.match(report, /Debrief Feedback Release Guard/);
assert.match(report, /hold_debrief_release/);
assert.match(report, /PRIVATE_BENCHMARK_LEAK/);

const svg = renderSvgSummary(holdResult);
assert.match(svg, /^<\?xml version="1\.0"/);
assert.match(svg, /Challenge Debrief Feedback Release Guard/);
assert.match(svg, /hold_debrief_release/);

assert.equal(digest(cleanPacket), digest(clone(cleanPacket)));
assert.notEqual(digest(cleanPacket), digest(revisionPacket));

assert.throws(() => evaluateDebriefPacket(null), /packet object/);

console.log("All debrief feedback release guard tests passed.");
