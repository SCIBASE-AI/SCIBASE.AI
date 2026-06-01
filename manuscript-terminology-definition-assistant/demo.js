const fs = require("node:fs");
const path = require("node:path");
const { evaluateTerminologyPacket, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const cleanEvaluation = evaluateTerminologyPacket(cleanPacket);
const riskyEvaluation = evaluateTerminologyPacket(riskyPacket);

fs.writeFileSync(
  path.join(reportsDir, "clean-terminology-packet.json"),
  `${JSON.stringify({ input: cleanPacket, evaluation: cleanEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "risky-terminology-packet.json"),
  `${JSON.stringify({ input: riskyPacket, evaluation: riskyEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "terminology-review-report.md"),
  renderMarkdownReport(riskyPacket, riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "summary.svg"),
  renderSvgSummary(riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "demo-script.txt"),
  [
    "Manuscript terminology definition assistant demo",
    "",
    `Clean packet decision: ${cleanEvaluation.summary.decision}`,
    `Clean audit digest: ${cleanEvaluation.summary.auditDigest}`,
    "",
    `Risky packet decision: ${riskyEvaluation.summary.decision}`,
    `Risky finding count: ${riskyEvaluation.summary.findingCount}`,
    `Risky audit digest: ${riskyEvaluation.summary.auditDigest}`,
    "",
    "The risky packet demonstrates acronym expansion conflicts, missing first-use definitions, unknown citation term bindings, nomenclature style drift, and unexplained lay-summary jargon.",
    ""
  ].join("\n")
);

console.log(JSON.stringify({
  cleanDecision: cleanEvaluation.summary.decision,
  riskyDecision: riskyEvaluation.summary.decision,
  riskyFindings: riskyEvaluation.summary.findingCount,
  report: "reports/terminology-review-report.md"
}, null, 2));
