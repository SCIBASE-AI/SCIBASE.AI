const assert = require("node:assert/strict");
const data = require("./sample-data");
const { digest, evaluateRoundTrip, renderMarkdown, renderSvg, runRoundTripAudit } = require("./index");

const report = runRoundTripAudit(data);
const byFormat = new Map(report.formatReports.map((formatReport) => [formatReport.format, formatReport]));

assert.equal(report.checker, "scientific-roundtrip-fidelity-checker");
assert.equal(report.summary.releaseDecision, "repair-before-submit");
assert.equal(report.formatReports.length, 3);
assert.match(report.auditDigest, /^[a-f0-9]{64}$/);

assert.equal(byFormat.get("markdown").decision, "repair-before-submit");
assert.ok(byFormat.get("markdown").findings.some((finding) => finding.code === "suggestion-lost"));
assert.ok(byFormat.get("markdown").findings.some((finding) => finding.code === "cross-reference-lost"));

assert.equal(byFormat.get("latex").decision, "repair-before-submit");
assert.ok(byFormat.get("latex").findings.some((finding) => finding.code === "equation-mutated"));
assert.ok(byFormat.get("latex").findings.some((finding) => finding.code === "citation-key-lost"));
assert.ok(byFormat.get("latex").findings.some((finding) => finding.code === "table-column-lost"));

assert.equal(byFormat.get("notebook").decision, "repair-before-submit");
assert.ok(byFormat.get("notebook").findings.some((finding) => finding.code === "cell-output-mutated"));
assert.ok(byFormat.get("notebook").findings.some((finding) => finding.code === "cell-execution-count-drift"));

const emptyNotebook = {
  format: "notebook",
  exporter: "test",
  importer: "test",
  timestamp: "2026-05-20T10:00:00Z",
  blocks: [],
  crossReferences: []
};
const emptyReport = evaluateRoundTrip(data.canonicalDocument, emptyNotebook);
assert.equal(emptyReport.decision, "block-export");
assert.ok(emptyReport.findings.some((finding) => finding.code === "block-dropped"));

assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
assert.ok(renderMarkdown(report).includes("Round-Trip Fidelity Review"));
assert.ok(renderSvg(report).startsWith("<svg"));

console.log("Scientific round-trip fidelity checker tests passed");
