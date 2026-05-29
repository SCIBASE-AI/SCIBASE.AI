const fs = require("fs");
const path = require("path");
const { reputationBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateBatch(reputationBatch);
fs.writeFileSync(path.join(reportsDir, "review-abuse-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Reputation Review-Abuse Guard Report",
  "",
  `Batch: ${report.batchId}`,
  `Generated: ${report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Reviews evaluated: ${report.summary.total}`,
  `- Credits counted: ${report.summary["count-reputation-credit"] || 0}`,
  `- Credits held: ${report.summary["hold-reputation-credit"] || 0}`,
  `- Findings: ${report.summary.findingCount}`,
  "",
  "## Decisions",
  "",
  ...report.reviews.flatMap((review) => [
    `### ${review.id}`,
    "",
    `- Reviewer: ${review.reviewer}`,
    `- Decision: ${review.decision}`,
    `- Findings: ${review.findings.length ? review.findings.join("; ") : "none"}`,
    `- Actions: ${review.actions.join("; ")}`,
    ""
  ])
].join("\n").trim();

fs.writeFileSync(path.join(reportsDir, "review-abuse-report.md"), `${markdown}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f9fafb"/>
  <text x="48" y="64" font-family="Arial" font-size="28" font-weight="700" fill="#172033">Review-Abuse Reputation Guard</text>
  <text x="48" y="102" font-family="Arial" font-size="16" fill="#4f5d75">Peer review credit moderation before leaderboard updates</text>
  ${report.reviews.map((review, index) => {
    const y = 150 + index * 82;
    const color = review.decision === "count-reputation-credit" ? "#047857" : "#b45309";
    return `<rect x="48" y="${y - 34}" width="864" height="58" rx="6" fill="#ffffff" stroke="#d7dce6"/>
  <text x="72" y="${y - 8}" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${review.id}</text>
  <text x="72" y="${y + 16}" font-family="Arial" font-size="14" fill="${color}">${review.decision}</text>
  <text x="310" y="${y + 16}" font-family="Arial" font-size="14" fill="#4f5d75">${review.findings.length} finding(s), delta ${review.scoreDelta}</text>`;
  }).join("\n  ")}
</svg>
`;

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
console.log(JSON.stringify(report.summary, null, 2));
