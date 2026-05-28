const assert = require("assert");
const { evaluateSessionStepUp, renderMarkdownReport, renderSvgSummary, digest } = require("./index");
const { riskyPacket, safePacket } = require("./sample-data");

const risky = evaluateSessionStepUp(riskyPacket);
assert.strictEqual(risky.decision, "deny-until-step-up");
assert.ok(risky.riskScore >= 90, "restricted export should produce a strong step-up hold");
assert.ok(risky.findings.some((finding) => finding.code === "STEP_UP_REQUIRED"));
assert.ok(risky.findings.some((finding) => finding.code === "UNTRUSTED_DEVICE"));
assert.ok(risky.findings.some((finding) => finding.code === "IMPOSSIBLE_TRAVEL"));
assert.ok(risky.findings.some((finding) => finding.code === "STALE_SESSION"));
assert.ok(risky.findings.some((finding) => finding.code === "MANAGED_DEVICE_REQUIRED"));

const repeat = evaluateSessionStepUp(riskyPacket);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest should be deterministic");

const safe = evaluateSessionStepUp(safePacket);
assert.strictEqual(safe.decision, "allow");
assert.strictEqual(safe.findings.length, 0);

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Project Session Step-Up Review"));
assert.ok(markdown.includes("Synthetic user/session/project packet only"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Project Session Step-Up Guard"));

assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

console.log("session-stepup-guard tests passed");
