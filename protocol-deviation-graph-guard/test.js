const assert = require("assert");
const { samplePacket } = require("./sample-data");
const { auditProtocolDeviationGraph, renderMarkdown, renderSvg } = require("./index");

const report = auditProtocolDeviationGraph(samplePacket);

assert.strictEqual(report.module, "protocol-deviation-graph-guard");
assert.strictEqual(report.totals.experiments, 2);
assert.strictEqual(report.totals.publishEdges, 2);
assert.strictEqual(report.totals.holdEdges, 3);
assert.strictEqual(report.decision, "hold-unsafe-graph-edges");

const safeExperiment = report.experimentReports.find(
  (item) => item.experimentId === "experiment:organoid-run-2026-05-18"
);
assert.ok(safeExperiment);
assert.strictEqual(safeExperiment.decision, "publish");
assert.deepStrictEqual(safeExperiment.findings, []);

const riskyExperiment = report.experimentReports.find(
  (item) => item.experimentId === "experiment:organoid-run-2026-05-29"
);
assert.ok(riskyExperiment);
assert.strictEqual(riskyExperiment.decision, "hold");
assert.ok(riskyExperiment.findings.some((finding) => finding.code === "missing-required-step"));
assert.ok(riskyExperiment.findings.some((finding) => finding.code === "protocol-version-mismatch"));
assert.ok(riskyExperiment.findings.some((finding) => finding.code === "unauthorized-reagent-lot"));
assert.ok(riskyExperiment.findings.some((finding) => finding.code === "parameter-out-of-tolerance"));
assert.ok(riskyExperiment.edgeActions.every((edge) => edge.action === "hold"));

const markdown = renderMarkdown(report);
assert.ok(markdown.includes("Protocol Deviation Graph Guard Report"));
assert.ok(markdown.includes("hold-unsafe-graph-edges"));
assert.ok(markdown.includes("Synthetic data only"));

const svg = renderSvg(report);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("held graph edges"));

const unknownReport = auditProtocolDeviationGraph({
  protocols: [],
  experiments: [
    {
      id: "experiment:unknown-protocol",
      protocolId: "protocol:missing",
      protocolVersion: "1.0.0",
      steps: [],
      proposedEdges: [{ from: "dataset:x", to: "protocol:missing", type: "followed-protocol" }]
    }
  ]
});
assert.strictEqual(unknownReport.totals.holdEdges, 1);
assert.ok(unknownReport.experimentReports[0].findings[0].code === "unknown-protocol");

console.log("protocol-deviation-graph-guard tests passed");
