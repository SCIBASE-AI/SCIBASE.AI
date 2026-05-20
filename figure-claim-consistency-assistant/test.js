const assert = require("node:assert/strict");
const data = require("./sample-data");
const { effectWithinTolerance, renderMarkdown, renderSvg, runAssistant } = require("./index");

const report = runAssistant(data);
const byClaim = new Map(report.claimReports.map((claim) => [claim.claimId, claim]));

assert.equal(report.assistant, "figure-claim-consistency-assistant");
assert.equal(report.summary.releaseStatus, "block-release");
assert.equal(report.claimReports.length, 4);
assert.match(report.auditDigest, /^[a-f0-9]{64}$/);

assert.equal(byClaim.get("C1").status, "ready-with-notes");
assert.ok(byClaim.get("C1").score >= 82);

assert.equal(byClaim.get("C2").status, "major-revision");
assert.ok(byClaim.get("C2").issues.some((issue) => issue.code === "effect-direction-mismatch"));
assert.ok(byClaim.get("C2").issues.some((issue) => issue.code === "multiplicity-adjustment-missing"));
assert.ok(byClaim.get("C2").issues.some((issue) => issue.code === "visual-accessibility-risk"));

assert.equal(byClaim.get("C3").status, "major-revision");
assert.ok(byClaim.get("C3").issues.some((issue) => issue.code === "axis-unit-mismatch"));
assert.ok(byClaim.get("C3").issues.some((issue) => issue.code === "missing-analysis-notebook"));

assert.equal(byClaim.get("C4").status, "block-release");
assert.ok(byClaim.get("C4").issues.some((issue) => issue.code === "missing-figure"));
assert.ok(byClaim.get("C4").issues.some((issue) => issue.code === "missing-table"));
assert.ok(byClaim.get("C4").issues.some((issue) => issue.code === "required-artifact-missing"));

assert.equal(effectWithinTolerance({ expectedDirection: "below-threshold", reportedEffect: 5 }, 4.9), true);
assert.equal(effectWithinTolerance({ expectedDirection: "below-threshold", reportedEffect: 5 }, 6.1), false);

const markdown = renderMarkdown(report);
assert.ok(markdown.includes("Figure Claim Consistency Review"));
assert.ok(markdown.includes("Audit digest"));

const svg = renderSvg(report);
assert.ok(svg.startsWith("<svg"));
assert.ok(svg.includes("Figure/Table Claim Consistency Assistant"));

console.log("Figure claim consistency assistant tests passed");
