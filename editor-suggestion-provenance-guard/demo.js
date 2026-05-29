const fs = require("fs");
const path = require("path");
const { suggestionBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateBatch(suggestionBatch);
fs.writeFileSync(path.join(reportsDir, "suggestion-provenance-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Editor Suggestion Provenance Guard Report",
  "",
  `Batch: ${report.batchId}`,
  `Generated: ${report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Suggestions evaluated: ${report.summary.total}`,
  `- Accepted/displayable: ${report.summary["accept-or-display"] || 0}`,
  `- Held: ${report.summary["hold-suggestion"] || 0}`,
  `- Findings: ${report.summary.findingCount}`,
  "",
  "## Decisions",
  "",
  ...report.suggestions.flatMap((item) => [
    `### ${item.id}`,
    "",
    `- Document: ${item.documentId}`,
    `- Section: ${item.sectionId}`,
    `- Decision: ${item.decision}`,
    `- Findings: ${item.findings.length ? item.findings.join("; ") : "none"}`,
    `- Actions: ${item.actions.join("; ")}`,
    ""
  ])
].join("\n").trim();

fs.writeFileSync(path.join(reportsDir, "suggestion-provenance-report.md"), `${markdown}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="64" font-family="Arial" font-size="28" font-weight="700" fill="#172033">Suggestion Provenance Guard</text>
  <text x="48" y="102" font-family="Arial" font-size="16" fill="#4f5d75">Tracked-change auditability for collaborative research editing</text>
  ${report.suggestions.map((item, index) => {
    const y = 150 + index * 82;
    const color = item.decision === "accept-or-display" ? "#047857" : "#b45309";
    return `<rect x="48" y="${y - 34}" width="864" height="58" rx="6" fill="#ffffff" stroke="#d7dce6"/>
  <text x="72" y="${y - 8}" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${item.id}</text>
  <text x="72" y="${y + 16}" font-family="Arial" font-size="14" fill="${color}">${item.decision}</text>
  <text x="300" y="${y + 16}" font-family="Arial" font-size="14" fill="#4f5d75">${item.sectionId}, ${item.findings.length} finding(s)</text>`;
  }).join("\n  ")}
</svg>
`;

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
console.log(JSON.stringify(report.summary, null, 2));
