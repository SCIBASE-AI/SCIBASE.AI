const fs = require("node:fs");
const path = require("node:path");
const { evaluateMediaPacket, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const cleanEvaluation = evaluateMediaPacket(cleanPacket);
const riskyEvaluation = evaluateMediaPacket(riskyPacket);

fs.writeFileSync(
  path.join(reportsDir, "clean-media-packet.json"),
  `${JSON.stringify({ input: cleanPacket, evaluation: cleanEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "risky-media-packet.json"),
  `${JSON.stringify({ input: riskyPacket, evaluation: riskyEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "media-accessibility-report.md"),
  renderMarkdownReport(riskyPacket, riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "summary.svg"),
  renderSvgSummary(riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "demo-script.txt"),
  [
    "Supplementary media accessibility preview guard demo",
    "",
    `Clean packet decision: ${cleanEvaluation.summary.decision}`,
    `Clean audit digest: ${cleanEvaluation.summary.auditDigest}`,
    "",
    `Risky packet decision: ${riskyEvaluation.summary.decision}`,
    `Risky finding count: ${riskyEvaluation.summary.findingCount}`,
    `Risky audit digest: ${riskyEvaluation.summary.auditDigest}`,
    "",
    "The risky packet demonstrates an embargoed restricted video exposed for public preview, incomplete transcript coverage, unlabeled segments, thumbnail/preview checksum drift, missing alt text, missing captions, and incomplete accessibility metadata.",
    ""
  ].join("\n")
);

console.log(JSON.stringify({
  cleanDecision: cleanEvaluation.summary.decision,
  riskyDecision: riskyEvaluation.summary.decision,
  riskyFindings: riskyEvaluation.summary.findingCount,
  report: "reports/media-accessibility-report.md"
}, null, 2));
