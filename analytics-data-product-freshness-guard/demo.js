const fs = require("node:fs");
const path = require("node:path");
const { evaluateFreshnessPacket, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const cleanEvaluation = evaluateFreshnessPacket(cleanPacket);
const riskyEvaluation = evaluateFreshnessPacket(riskyPacket);

fs.writeFileSync(
  path.join(reportsDir, "clean-freshness-packet.json"),
  `${JSON.stringify({ input: cleanPacket, evaluation: cleanEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "risky-freshness-packet.json"),
  `${JSON.stringify({ input: riskyPacket, evaluation: riskyEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "freshness-review-report.md"),
  renderMarkdownReport(riskyPacket, riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "summary.svg"),
  renderSvgSummary(riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "demo-script.txt"),
  [
    "Analytics data product freshness billing guard demo",
    "",
    `Clean packet decision: ${cleanEvaluation.summary.decision}`,
    `Clean net invoice cents: ${cleanEvaluation.summary.netInvoiceCents}`,
    `Clean audit digest: ${cleanEvaluation.summary.auditDigest}`,
    "",
    `Risky packet decision: ${riskyEvaluation.summary.decision}`,
    `Risky finding count: ${riskyEvaluation.summary.findingCount}`,
    `Risky recommended credit cents: ${riskyEvaluation.summary.recommendedCreditCents}`,
    `Risky audit digest: ${riskyEvaluation.summary.auditDigest}`,
    "",
    "The risky packet demonstrates stale snapshots, incomplete metric coverage, anonymization threshold breach, unresolved withdrawal and embargo impacts, stale reproducibility feed evidence, and missing customer delivery proof.",
    ""
  ].join("\n")
);

console.log(JSON.stringify({
  cleanDecision: cleanEvaluation.summary.decision,
  riskyDecision: riskyEvaluation.summary.decision,
  riskyFindings: riskyEvaluation.summary.findingCount,
  report: "reports/freshness-review-report.md"
}, null, 2));
