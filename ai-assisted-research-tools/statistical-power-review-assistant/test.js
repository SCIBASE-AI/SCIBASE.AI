const assert = require("assert");
const {
  digest,
  effectiveSampleSize,
  evaluateStatisticalPower,
  renderMarkdownReport,
  renderSvgSummary,
  requiredSampleSize,
} = require("./index");
const { reviewContext, sufficientlyPoweredManuscript, underpoweredManuscript } = require("./sample-data");

const risky = evaluateStatisticalPower(underpoweredManuscript, reviewContext);
assert.strictEqual(risky.decision, "hold-claim-for-power-review");
assert.ok(risky.riskScore >= 90, "underpowered manuscript should produce a strong hold score");
assert.ok(risky.findings.some((item) => item.code === "MISSING_SAMPLE_SIZE_JUSTIFICATION"));
assert.ok(risky.findings.some((item) => item.code === "PLANNED_POWER_BELOW_THRESHOLD"));
assert.ok(risky.findings.some((item) => item.code === "EFFECTIVE_N_BELOW_REQUIRED"));
assert.ok(risky.findings.some((item) => item.code === "ATTRITION_SENSITIVITY_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "EFFECT_SIZE_SOURCE_MISMATCH"));
assert.ok(risky.findings.some((item) => item.code === "SUBGROUP_N_TOO_SMALL"));
assert.ok(risky.findings.some((item) => item.code === "EVENTS_PER_PARAMETER_TOO_LOW"));
assert.ok(risky.findings.some((item) => item.code === "AI_SUMMARY_CONFIDENCE_TOO_HIGH"));

const repeat = evaluateStatisticalPower(underpoweredManuscript, reviewContext);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const safe = evaluateStatisticalPower(sufficientlyPoweredManuscript, reviewContext);
assert.strictEqual(safe.decision, "sufficient-power-evidence");
assert.strictEqual(safe.findings.length, 0);

assert.strictEqual(effectiveSampleSize(underpoweredManuscript.endpoints[0]), 56);
assert.ok(requiredSampleSize(0.35, 0.8, 0.05) > 120);

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Statistical Power Review"));
assert.ok(markdown.includes("Synthetic manuscript packet only"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Statistical Power Review Assistant"));

assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

console.log("statistical-power-review-assistant tests passed");
