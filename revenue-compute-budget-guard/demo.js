const fs = require("node:fs");
const path = require("node:path");
const sample = require("./sample-data.json");
const { evaluatePortfolio, renderMarkdownReport } = require("./budgetGuard");

const now = "2026-06-06T00:00:00Z";
const assessment = evaluatePortfolio(sample, { now });
const outDir = path.join(__dirname, "artifacts");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "demo-output.json"),
  `${JSON.stringify(assessment, null, 2)}\n`
);
fs.writeFileSync(path.join(outDir, "demo-report.md"), renderMarkdownReport(assessment));

console.log("Compute budget guard demo");
console.log(`Portfolio: ${assessment.portfolioId}`);
console.log(`Generated: ${assessment.generatedAt}`);
console.log("");
for (const account of assessment.accounts) {
  console.log(`${account.accountId}: ${account.decision}`);
  for (const finding of account.findings) {
    console.log(`  - ${finding.severity.toUpperCase()} ${finding.code}`);
  }
}
console.log("");
console.log("Artifacts written:");
console.log(`- ${path.join("artifacts", "demo-output.json")}`);
console.log(`- ${path.join("artifacts", "demo-report.md")}`);
