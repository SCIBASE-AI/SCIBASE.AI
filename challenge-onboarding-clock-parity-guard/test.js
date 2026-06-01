"use strict";

const assert = require("node:assert/strict");
const {
  evaluateOnboardingClockPacket,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateOnboardingClockPacket(cleanPacket, { now: "2026-06-01T10:30:00.000Z" });
assert.equal(clean.status, "READY");
assert.equal(clean.findings.length, 0);
assert.equal(clean.teamReadiness.length, 2);
assert.equal(clean.nextClockStart, "2026-06-03T14:58:00.000Z");

const risky = evaluateOnboardingClockPacket(riskyPacket, { now: "2026-06-01T10:30:00.000Z" });
const riskyCodes = new Set(risky.findings.map((finding) => finding.code));
assert.equal(risky.status, "HOLD");
assert.ok(riskyCodes.has("WORKSPACE_NOT_READY"));
assert.ok(riskyCodes.has("WORKSPACE_READY_AFTER_CLOCK_START"));
assert.ok(riskyCodes.has("CLOCK_START_BEFORE_ALL_TEAMS_READY"));
assert.ok(riskyCodes.has("WORKSPACE_TEMPLATE_MISMATCH"));
assert.ok(riskyCodes.has("STARTER_KIT_CHECKSUM_MISMATCH"));
assert.ok(riskyCodes.has("REQUIRED_TOOL_ACCESS_MISSING"));
assert.ok(riskyCodes.has("COMPUTE_QUOTA_BELOW_BASELINE"));
assert.ok(riskyCodes.has("SUPPORT_CHANNEL_VISIBILITY_MISSING"));
assert.ok(riskyCodes.has("SETUP_BLOCKER_RESPONSE_AFTER_CLOCK_START"));
assert.ok(riskyCodes.has("UNAPPROVED_EXTRA_TOOL_ACCESS"));

const repeatedRisky = evaluateOnboardingClockPacket(riskyPacket, { now: "2026-06-01T10:35:00.000Z" });
assert.equal(risky.fingerprint, repeatedRisky.fingerprint);

const markdown = renderMarkdownReport(risky, riskyPacket);
assert.match(markdown, /Challenge Onboarding Clock Parity Guard/);
assert.match(markdown, /CLOCK_START_BEFORE_ALL_TEAMS_READY/);
assert.match(markdown, /Team Readiness/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Onboarding clock parity/);
assert.match(svg, /Status HOLD/);

assert.throws(() => evaluateOnboardingClockPacket(null), /expects a packet object/);

console.log("All onboarding clock parity guard tests passed.");
