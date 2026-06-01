"use strict";

const assert = require("node:assert/strict");
const {
  evaluateAccessDenialAppeals,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateAccessDenialAppeals(cleanPacket, { now: "2026-06-01T11:00:00.000Z" });
assert.equal(clean.status, "READY");
assert.equal(clean.findings.length, 0);
assert.equal(clean.appealDecisions.length, 1);
assert.equal(clean.appealDecisions[0].finalAction, "uphold-denial");

const risky = evaluateAccessDenialAppeals(riskyPacket, { now: "2026-06-01T11:00:00.000Z" });
assert.equal(risky.status, "HOLD");
assert.ok(risky.findings.some((finding) => finding.code === "PRIVATE_DENIAL_NOTE_EXPOSED"));
assert.ok(risky.findings.some((finding) => finding.code === "PRIVATE_APPEAL_NOTE_EXPOSED"));
assert.ok(risky.findings.some((finding) => finding.code === "APPEAL_WINDOW_EXPIRED"));
assert.ok(risky.findings.some((finding) => finding.code === "APPEAL_REVIEWER_NOT_INDEPENDENT"));
assert.ok(risky.findings.some((finding) => finding.code === "APPROVAL_WITH_MISSING_RESTRICTED_EVIDENCE"));
assert.equal(risky.appealDecisions[0].finalAction, "hold-decision");

const markdown = renderMarkdownReport(risky, riskyPacket);
assert.match(markdown, /Project Access Denial and Appeal Guard/);
assert.match(markdown, /PRIVATE_DENIAL_NOTE_EXPOSED/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Access denial appeal guard/);

assert.throws(() => evaluateAccessDenialAppeals(null), /expects a packet object/);

console.log("project-access-denial-appeal-guard tests passed");
