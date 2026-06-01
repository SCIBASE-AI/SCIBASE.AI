const fs = require("node:fs");
const path = require("node:path");
const { evaluateStylePackage, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const cleanEvaluation = evaluateStylePackage(cleanPacket);
const riskyEvaluation = evaluateStylePackage(riskyPacket);

fs.writeFileSync(
  path.join(reportsDir, "clean-style-package.json"),
  `${JSON.stringify({ input: cleanPacket, evaluation: cleanEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "risky-style-package.json"),
  `${JSON.stringify({ input: riskyPacket, evaluation: riskyEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "style-package-provenance-report.md"),
  renderMarkdownReport(riskyPacket, riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "summary.svg"),
  renderSvgSummary(riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "demo-script.txt"),
  [
    "Enterprise style package provenance guard demo",
    "",
    `Clean packet decision: ${cleanEvaluation.summary.decision}`,
    `Clean audit digest: ${cleanEvaluation.summary.auditDigest}`,
    "",
    `Risky packet decision: ${riskyEvaluation.summary.decision}`,
    `Risky finding count: ${riskyEvaluation.summary.findingCount}`,
    `Risky audit digest: ${riskyEvaluation.summary.auditDigest}`,
    "",
    "The risky packet demonstrates a formatting plugin drift before JATS/DOCX/LaTeX export: unapproved plugin version, missing formats, checksum drift, citation mismatch, stale validation, missing signoff, metadata preservation gaps, and private preview-field leakage.",
    ""
  ].join("\n")
);

console.log(JSON.stringify({
  cleanDecision: cleanEvaluation.summary.decision,
  riskyDecision: riskyEvaluation.summary.decision,
  riskyFindings: riskyEvaluation.summary.findingCount,
  report: "reports/style-package-provenance-report.md"
}, null, 2));
