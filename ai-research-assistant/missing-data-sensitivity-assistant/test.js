const assert = require("assert");
const {
  analyzeMissingData,
  makeDigest,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { highRiskStudy, lowRiskStudy } = require("./sample-data");

const highRisk = analyzeMissingData(highRiskStudy);
assert.strictEqual(highRisk.decision, "hold-review");
assert.ok(highRisk.riskScore >= 70, "high risk packet should produce a strong hold score");
assert.ok(highRisk.findings.some((finding) => finding.code === "ATTRITION_IMBALANCE"));
assert.ok(highRisk.findings.some((finding) => finding.code === "WEAK_IMPUTATION_METHOD"));
assert.ok(highRisk.findings.some((finding) => finding.code === "MISSING_MNAR_SENSITIVITY"));
assert.ok(highRisk.findings.some((finding) => finding.code === "OVERSTATED_COMPLETE_CASE_CLAIM"));

const stableHighRisk = analyzeMissingData(highRiskStudy);
assert.strictEqual(highRisk.auditDigest, stableHighRisk.auditDigest, "audit digest should be deterministic");

const lowRisk = analyzeMissingData(lowRiskStudy);
assert.strictEqual(lowRisk.decision, "ready-with-notes");
assert.ok(lowRisk.riskScore < 20, "low risk packet should not be over-flagged");
assert.ok(!lowRisk.findings.some((finding) => finding.severity === "high" || finding.severity === "blocker"));

const markdown = renderMarkdownReport(highRisk);
assert.ok(markdown.includes("Missing Data Sensitivity Review"));
assert.ok(markdown.includes("Synthetic data only"));

const svg = renderSvgSummary(highRisk);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Missing Data Sensitivity Assistant"));

assert.strictEqual(makeDigest({ b: 2, a: 1 }), makeDigest({ a: 1, b: 2 }));

console.log("missing-data-sensitivity-assistant tests passed");
