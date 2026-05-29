const fs = require("fs");
const path = require("path");
const { submissionBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateBatch(submissionBatch);
fs.writeFileSync(path.join(reportsDir, "submission-quarantine-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Scientific Bounty Submission Quarantine Report",
  "",
  `Batch: ${report.batchId}`,
  `Generated: ${report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Submissions evaluated: ${report.summary.total}`,
  `- Released to review: ${report.summary["release-to-review"] || 0}`,
  `- Quarantined: ${report.summary["quarantine-submission"] || 0}`,
  `- Findings: ${report.summary.findingCount}`,
  "",
  "## Decisions",
  "",
  ...report.submissions.flatMap((item) => [
    `### ${item.id}`,
    "",
    `- Challenge: ${item.challengeId}`,
    `- Team: ${item.teamId}`,
    `- Decision: ${item.decision}`,
    `- Findings: ${item.findings.length ? item.findings.join("; ") : "none"}`,
    `- Actions: ${item.actions.join("; ")}`,
    ""
  ])
].join("\n").trim();

fs.writeFileSync(path.join(reportsDir, "submission-quarantine-report.md"), `${markdown}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="64" font-family="Arial" font-size="28" font-weight="700" fill="#172033">Submission Quarantine Guard</text>
  <text x="48" y="102" font-family="Arial" font-size="16" fill="#4f5d75">Scientific bounty package safety before sponsor access</text>
  ${report.submissions.map((item, index) => {
    const y = 150 + index * 82;
    const color = item.decision === "release-to-review" ? "#047857" : "#b45309";
    return `<rect x="48" y="${y - 34}" width="864" height="58" rx="6" fill="#ffffff" stroke="#d7dce6"/>
  <text x="72" y="${y - 8}" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${item.id}</text>
  <text x="72" y="${y + 16}" font-family="Arial" font-size="14" fill="${color}">${item.decision}</text>
  <text x="300" y="${y + 16}" font-family="Arial" font-size="14" fill="#4f5d75">${item.teamId}, ${item.findings.length} finding(s)</text>`;
  }).join("\n  ")}
</svg>
`;
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
console.log(JSON.stringify(report.summary, null, 2));
