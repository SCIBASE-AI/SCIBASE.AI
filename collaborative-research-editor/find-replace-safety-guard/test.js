const assert = require("assert");
const { replacementPreview, renderMarkdownReport, renderSvgSummary, digest } = require("./index");
const { riskyDocument, safeDocument, riskyOperation, safeOperation } = require("./sample-data");

const risky = replacementPreview(riskyDocument, riskyOperation);
assert.strictEqual(risky.decision, "hold-batch-edit");
assert.ok(risky.riskScore >= 90, "risky batch edit should produce a strong hold score");
assert.ok(risky.findings.some((finding) => finding.code === "LOCKED_SECTION_MATCH"));
assert.ok(risky.findings.some((finding) => finding.code === "LATEX_COMMAND_MUTATION"));
assert.ok(risky.findings.some((finding) => finding.code === "CODE_CELL_MUTATION"));
assert.ok(risky.findings.some((finding) => finding.code === "CITATION_KEY_MUTATION"));
assert.ok(risky.findings.some((finding) => finding.code === "COMMENT_ANCHOR_DRIFT"));
assert.ok(risky.findings.some((finding) => finding.code === "WYSIWYG_SCOPE_MISMATCH"));

const repeat = replacementPreview(riskyDocument, riskyOperation);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const safe = replacementPreview(safeDocument, safeOperation);
assert.strictEqual(safe.decision, "safe-to-apply");
assert.strictEqual(safe.findings.length, 0);
assert.strictEqual(safe.changedBlocks.length, 1);

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Collaborative Find/Replace Safety Review"));
assert.ok(markdown.includes("Synthetic document packet only"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Collaborative Find/Replace Safety Guard"));

assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

console.log("find-replace-safety-guard tests passed");
