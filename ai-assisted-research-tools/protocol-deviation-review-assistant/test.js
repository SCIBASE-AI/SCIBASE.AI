const assert = require("assert");
const {
  digest,
  reviewProtocolDeviations,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const {
  alignedManuscript,
  alignedProtocol,
  reviewContext,
  riskyManuscript,
  riskyProtocol,
} = require("./sample-data");

const risky = reviewProtocolDeviations(riskyProtocol, riskyManuscript, reviewContext);
assert.strictEqual(risky.decision, "hold-confirmatory-claim");
assert.ok(risky.riskScore >= 90, "risky manuscript should produce a strong hold score");
assert.ok(risky.findings.some((item) => item.code === "UNPLANNED_ENDPOINT_REPORTED"));
assert.ok(risky.findings.some((item) => item.code === "PLANNED_ENDPOINT_NOT_REPORTED"));
assert.ok(risky.findings.some((item) => item.code === "ENDPOINT_ROLE_CHANGED"));
assert.ok(risky.findings.some((item) => item.code === "UNPLANNED_ANALYSIS_MODEL"));
assert.ok(risky.findings.some((item) => item.code === "OUTCOME_INFORMED_MODEL_TUNING"));
assert.ok(risky.findings.some((item) => item.code === "UNPLANNED_EXCLUSION_REASON"));
assert.ok(risky.findings.some((item) => item.code === "OUTCOME_AWARE_EXCLUSION"));
assert.ok(risky.findings.some((item) => item.code === "DECLARED_AMENDMENT_NOT_FOUND"));
assert.ok(risky.findings.some((item) => item.code === "AMENDMENT_TIMESTAMP_TOO_LATE"));
assert.ok(risky.findings.some((item) => item.code === "AI_SUMMARY_OVERSTATES_CONFIRMATORY_STATUS"));

const repeat = reviewProtocolDeviations(riskyProtocol, riskyManuscript, reviewContext);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const aligned = reviewProtocolDeviations(alignedProtocol, alignedManuscript, reviewContext);
assert.strictEqual(aligned.decision, "protocol-aligned");
assert.strictEqual(aligned.findings.length, 0);

assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Protocol Deviation Review"));
assert.ok(markdown.includes("Synthetic protocol/manuscript data only"));
assert.ok(markdown.includes("hold-confirmatory-claim"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Protocol Deviation Review"));

console.log("protocol-deviation-review-assistant tests passed");
