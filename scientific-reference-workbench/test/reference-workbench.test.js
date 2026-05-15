const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  buildReferenceWorkbench,
  extractCitationKeys,
  extractCrossReferenceLabels,
  validateManuscript
} = require("../src/reference-workbench");

const samplePath = path.join(__dirname, "..", "data", "sample-manuscript.json");
const manuscript = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = buildReferenceWorkbench(manuscript);

assert.equal(report.validation.status, "passed");
assert.equal(report.dashboard.status, "format-review-needed");
assert.equal(report.citations.uniqueKeys.length, 3);
assert.deepEqual(report.citations.missing, ["missing2026"]);
assert.deepEqual(report.citations.unused, ["unused2023"]);
assert.equal(report.crossReferences.missing.length, 0);
assert.equal(report.styleChecklist.requiredSections.status, "passed");
assert.equal(report.styleChecklist.bibliographyCoverage.status, "failed");
assert.equal(report.styleChecklist.crossReferenceIntegrity.status, "passed");
assert.equal(report.tasks.length, 1);
assert.equal(report.tasks[0].type, "missing-citation");
assert.equal(report.numbering.citationNumbers.nguyen2025, 1);
assert.equal(report.numbering.citationNumbers.park2024, 2);
assert.equal(report.numbering.crossReferenceNumbers["fig:workflow"].display, "Figure 1");
assert.equal(report.numbering.crossReferenceNumbers["tbl:quality-gates"].display, "Table 1");
assert.equal(report.numbering.crossReferenceNumbers["eq:weighted-loss"].display, "Equation 1");
assert.ok(report.formattedBlocks[0].blocks[0].text.includes("[1]"));
assert.ok(report.formattedBlocks[1].blocks[0].text.includes("Equation 1"));
assert.equal(report.outline.exportBlocked, true);
assert.equal(report.digest, buildReferenceWorkbench(manuscript).digest);

assert.deepEqual(extractCitationKeys("See [@a; @b] and [@c]."), ["a", "b", "c"]);
assert.deepEqual(extractCrossReferenceLabels("Use {{fig:a}} and {{eq:b}}."), ["fig:a", "eq:b"]);

const incomplete = validateManuscript({ manuscriptId: "draft" });
assert.equal(incomplete.status, "incomplete");
assert.ok(incomplete.missing.includes("title"));

const resolved = JSON.parse(JSON.stringify(manuscript));
resolved.bibliography.push({
  key: "missing2026",
  title: "Registered Manuscript Formatting",
  authors: ["Ibrahim"],
  year: 2026
});
const resolvedReport = buildReferenceWorkbench(resolved);
assert.equal(resolvedReport.dashboard.status, "ready-to-export");
assert.equal(resolvedReport.tasks.length, 0);
assert.equal(resolvedReport.outline.exportBlocked, false);

console.log("scientific-reference-workbench tests passed");
