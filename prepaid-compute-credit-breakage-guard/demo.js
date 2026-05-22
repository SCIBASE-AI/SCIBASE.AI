const fs = require("node:fs");
const path = require("node:path");
const {
  analyzeCreditBreakage,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { sampleCreditLots } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const result = analyzeCreditBreakage(sampleCreditLots, {
  asOf: "2026-05-22T12:00:00.000Z",
  expiringSoonDays: 30,
});

fs.writeFileSync(
  path.join(reportsDir, "summary.json"),
  `${JSON.stringify(result, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "reviewer-packet.md"),
  renderMarkdownReport(result)
);
fs.writeFileSync(
  path.join(reportsDir, "summary.svg"),
  renderSvgSummary(result)
);

console.log("prepaid compute credit breakage guard demo artifacts written");
console.log(`audit digest: ${result.auditDigest}`);
