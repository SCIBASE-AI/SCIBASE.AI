const fs = require("fs");
const path = require("path");
const { billingBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateBatch(billingBatch);
fs.writeFileSync(path.join(reportsDir, "dunning-entitlement-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Revenue Dunning and Entitlement Hold Report",
  "",
  `Batch: ${report.batchId}`,
  `Generated: ${report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Accounts evaluated: ${report.summary.total}`,
  `- Kept active: ${report.summary["keep-active"] || 0}`,
  `- Finance exceptions: ${report.summary["finance-exception"] || 0}`,
  `- Entitlement holds: ${report.summary["hold-entitlements"] || 0}`,
  `- Findings: ${report.summary.findingCount}`,
  "",
  "## Decisions",
  "",
  ...report.accounts.flatMap((account) => [
    `### ${account.id}`,
    "",
    `- Decision: ${account.decision}`,
    `- Findings: ${account.findings.length ? account.findings.join("; ") : "none"}`,
    `- Actions: ${account.actions.join("; ")}`,
    ""
  ])
].join("\n").trim();

fs.writeFileSync(path.join(reportsDir, "dunning-entitlement-report.md"), `${markdown}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="64" font-family="Arial" font-size="28" font-weight="700" fill="#172033">Dunning Entitlement Guard</text>
  <text x="48" y="102" font-family="Arial" font-size="16" fill="#4f5d75">Failed-payment holds for compute and analytics revenue</text>
  ${report.accounts.map((account, index) => {
    const y = 150 + index * 82;
    const color = account.decision === "keep-active" ? "#047857" : account.decision === "finance-exception" ? "#2563eb" : "#b45309";
    return `<rect x="48" y="${y - 34}" width="864" height="58" rx="6" fill="#ffffff" stroke="#d7dce6"/>
  <text x="72" y="${y - 8}" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${account.id}</text>
  <text x="72" y="${y + 16}" font-family="Arial" font-size="14" fill="${color}">${account.decision}</text>
  <text x="310" y="${y + 16}" font-family="Arial" font-size="14" fill="#4f5d75">${account.findings.length} finding(s)</text>`;
  }).join("\n  ")}
</svg>
`;
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
console.log(JSON.stringify(report.summary, null, 2));
