const fs = require("node:fs");
const path = require("node:path");
const { evaluateReleasePacket, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanReleasePacket, riskyReleasePacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const cleanEvaluation = evaluateReleasePacket(cleanReleasePacket);
const riskyEvaluation = evaluateReleasePacket(riskyReleasePacket);

fs.writeFileSync(
  path.join(reportsDir, "clean-packet.json"),
  `${JSON.stringify({ input: cleanReleasePacket, evaluation: cleanEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "risky-packet.json"),
  `${JSON.stringify({ input: riskyReleasePacket, evaluation: riskyEvaluation }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "release-note-claim-report.md"),
  renderMarkdownReport(riskyReleasePacket, riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "summary.svg"),
  renderSvgSummary(riskyEvaluation)
);
fs.writeFileSync(
  path.join(reportsDir, "demo-script.txt"),
  [
    "Repository release-note claim evidence guard demo",
    "",
    "1. Clean packet: all release-note claims bind to changed artifacts, passed evidence, and export-manifest digests.",
    `   Decision: ${cleanEvaluation.summary.decision}`,
    `   Digest: ${cleanEvaluation.summary.auditDigest}`,
    "",
    "2. Risky packet: public release notes overclaim reproducibility, hide a breaking API change, cite a non-existent public dataset path, and omit changed data from the export manifest.",
    `   Decision: ${riskyEvaluation.summary.decision}`,
    `   Findings: ${riskyEvaluation.summary.findingCount}`,
    `   Digest: ${riskyEvaluation.summary.auditDigest}`,
    ""
  ].join("\n")
);

console.log(JSON.stringify({
  cleanDecision: cleanEvaluation.summary.decision,
  riskyDecision: riskyEvaluation.summary.decision,
  riskyFindings: riskyEvaluation.summary.findingCount,
  report: "reports/release-note-claim-report.md"
}, null, 2));
