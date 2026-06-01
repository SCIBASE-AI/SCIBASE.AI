"use strict";

const assert = require("node:assert/strict");
const {
  evaluateProbationReinstatementPacket,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateProbationReinstatementPacket(cleanPacket, { now: "2026-06-01T11:00:00.000Z" });
assert.equal(clean.status, "READY");
assert.equal(clean.findings.length, 0);
assert.equal(clean.reinstatementDecisions[0].decision, "ALLOW");

const risky = evaluateProbationReinstatementPacket(riskyPacket, { now: "2026-06-01T11:00:00.000Z" });
const codes = new Set(risky.findings.map((finding) => finding.code));
assert.equal(risky.status, "HOLD");
assert.ok(codes.has("PROBATION_WINDOW_ACTIVE"));
assert.ok(codes.has("OPEN_APPEAL_BLOCKS_REINSTATEMENT"));
assert.ok(codes.has("REMEDIATION_ACTIONS_INCOMPLETE"));
assert.ok(codes.has("REINSTATEMENT_REVIEW_QUORUM_MISSING"));
assert.ok(codes.has("REINSTATEMENT_SUMMARY_VISIBILITY_UNSAFE"));
assert.ok(codes.has("REPUTATION_DELTA_DURING_PROBATION"));
assert.ok(codes.has("REENTRY_SCORE_CAP_TOO_HIGH"));
assert.ok(codes.has("PROBATION_RECORD_INCOMPLETE"));
assert.ok(codes.has("REINSTATEMENT_REQUEST_MISSING"));
assert.equal(risky.reinstatementDecisions.filter((decision) => decision.decision === "HOLD").length, 2);

const repeatedRisky = evaluateProbationReinstatementPacket(riskyPacket, { now: "2026-06-01T11:05:00.000Z" });
assert.equal(risky.fingerprint, repeatedRisky.fingerprint);

const markdown = renderMarkdownReport(risky, riskyPacket);
assert.match(markdown, /Reputation Probation Reinstatement Guard/);
assert.match(markdown, /PROBATION_WINDOW_ACTIVE/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Probation reinstatement guard/);
assert.match(svg, /Status HOLD/);

assert.throws(() => evaluateProbationReinstatementPacket(null), /expects a packet object/);

console.log("All reputation probation reinstatement guard tests passed.");
