"use strict";

const assert = require("assert");
const fixture = require("./fixtures/proteomics-study.json");
const { reviewProteomicsEvidence, toMarkdown, toSvg } = require("./index");

const report = reviewProteomicsEvidence(fixture);

assert.strictEqual(report.studyId, "SYN-PROT-042");
assert.strictEqual(report.status, "block-ai-summary");
assert.ok(report.riskScore >= 90, `expected high risk score, got ${report.riskScore}`);
assert.ok(report.readinessScore <= 10, `expected low readiness score, got ${report.readinessScore}`);
assert.strictEqual(report.severityCounts.critical, 1);
assert.ok(report.severityCounts.high >= 4);

const findingIds = new Set(report.findings.map((finding) => finding.id));
[
  "protein-fdr-missing",
  "peptide-protein-ambiguity",
  "batch-confounded-design",
  "missingness-handling",
  "ptm-localization",
  "raw-data-availability"
].forEach((id) => assert.ok(findingIds.has(id), `missing expected finding ${id}`));

const markdown = toMarkdown(report);
assert.ok(markdown.includes("Proteomics Evidence Review"));
assert.ok(markdown.includes("block-ai-summary"));
assert.ok(markdown.includes("Protein-level FDR"));

const svg = toSvg(report);
assert.ok(svg.startsWith("<svg"));
assert.ok(svg.includes("Proteomics evidence readiness"));
assert.ok(svg.includes("SYN-PROT-042"));

console.log(`proteomics evidence reviewer tests passed (${report.findingCount} findings, risk ${report.riskScore})`);
