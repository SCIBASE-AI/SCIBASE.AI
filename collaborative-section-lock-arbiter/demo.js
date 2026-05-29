const fs = require("fs");
const path = require("path");
const { now, sections } = require("./sample-data");
const { evaluateLocks } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateLocks(sections, now);
fs.writeFileSync(
  path.join(reportsDir, "section-lock-report.json"),
  `${JSON.stringify(report, null, 2)}\n`
);

const markdown = [
  "# Collaborative Section Lock Arbitration Report",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Sections evaluated: ${report.summary.total}`,
  `- Findings: ${report.summary.findingCount}`,
  `- Blocked conflicts: ${report.summary["block-conflicting-edit"] || 0}`,
  `- Stale locks released: ${report.summary["release-stale-lock"] || 0}`,
  `- Reviewed overrides allowed: ${report.summary["allow-reviewed-override"] || 0}`,
  "",
  "## Decisions",
  "",
  ...report.decisions.flatMap((decision) => [
    `### ${decision.title}`,
    "",
    `- Decision: ${decision.decision}`,
    `- Findings: ${decision.findings.length ? decision.findings.join("; ") : "none"}`,
    `- Actions: ${decision.actions.join("; ")}`,
    ""
  ])
].join("\n").trim();

fs.writeFileSync(path.join(reportsDir, "section-lock-report.md"), `${markdown}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f7f8fb"/>
  <text x="48" y="64" font-family="Arial" font-size="28" font-weight="700" fill="#172033">Section Lock Arbiter</text>
  <text x="48" y="102" font-family="Arial" font-size="16" fill="#4f5d75">Real-time editor controlled-section decisions</text>
  ${report.decisions.map((decision, index) => {
    const y = 150 + index * 82;
    const color = decision.decision.includes("block") ? "#c2410c" : decision.decision.includes("release") ? "#047857" : "#2563eb";
    return `<rect x="48" y="${y - 34}" width="864" height="58" rx="6" fill="#ffffff" stroke="#d7dce6"/>
  <text x="72" y="${y - 8}" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${decision.title}</text>
  <text x="72" y="${y + 16}" font-family="Arial" font-size="14" fill="${color}">${decision.decision}</text>
  <text x="330" y="${y + 16}" font-family="Arial" font-size="14" fill="#4f5d75">${decision.findings.length} finding(s), ${decision.actions.length} action(s)</text>`;
  }).join("\n  ")}
</svg>
`;

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);

console.log(JSON.stringify(report.summary, null, 2));
