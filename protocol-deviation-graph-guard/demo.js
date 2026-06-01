const path = require("path");
const { samplePacket } = require("./sample-data");
const { auditProtocolDeviationGraph, writeReportArtifacts } = require("./index");

const outputDir = path.join(__dirname, "reports");
const report = auditProtocolDeviationGraph(samplePacket);
const artifacts = writeReportArtifacts(report, outputDir);

const demoScript = [
  "Protocol Deviation Graph Guard demo",
  "",
  "1. Load synthetic protocol and experiment graph packets.",
  "2. Compare observed experiment steps against required protocol steps and tolerances.",
  "3. Check protocol version, reagent lot, and instrument calibration evidence.",
  "4. Hold unsafe experiment-to-protocol and recommendation edges before publication.",
  "",
  `Decision: ${report.decision}`,
  `Held edges: ${report.totals.holdEdges}`,
  `Publishable edges: ${report.totals.publishEdges}`,
  "",
  "Synthetic data only. No private studies, credentials, live graph services, or external APIs."
].join("\n");

require("fs").writeFileSync(path.join(outputDir, "demo-script.txt"), `${demoScript}\n`);

console.log(JSON.stringify({ report: artifacts, decision: report.decision, totals: report.totals }, null, 2));
