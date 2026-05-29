const fs = require("fs");
const path = require("path");
const { releaseBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateBatch(releaseBatch);
fs.writeFileSync(path.join(reportsDir, "embargo-release-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Repository Embargo Release Guard Report",
  "",
  `Batch: ${report.batchId}`,
  `Release date: ${report.releaseDate}`,
  "",
  "## Summary",
  "",
  `- Assets evaluated: ${report.summary.total}`,
  `- Release ready: ${report.summary["release-ready"] || 0}`,
  `- Held: ${report.summary["hold-release"] || 0}`,
  `- Findings: ${report.summary.findingCount}`,
  "",
  "## Decisions",
  "",
  ...report.assets.flatMap((asset) => [
    `### ${asset.id}`,
    "",
    `- Path: ${asset.path}`,
    `- Decision: ${asset.decision}`,
    `- Findings: ${asset.findings.length ? asset.findings.join("; ") : "none"}`,
    `- Actions: ${asset.actions.join("; ")}`,
    ""
  ])
].join("\n").trim();

fs.writeFileSync(path.join(reportsDir, "embargo-release-report.md"), `${markdown}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="64" font-family="Arial" font-size="28" font-weight="700" fill="#172033">Repository Embargo Release Guard</text>
  <text x="48" y="102" font-family="Arial" font-size="16" fill="#4f5d75">Tagged release checks for embargoed scientific assets</text>
  ${report.assets.map((asset, index) => {
    const y = 150 + index * 82;
    const color = asset.decision === "release-ready" ? "#047857" : "#b45309";
    return `<rect x="48" y="${y - 34}" width="864" height="58" rx="6" fill="#ffffff" stroke="#d7dce6"/>
  <text x="72" y="${y - 8}" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${asset.id}</text>
  <text x="72" y="${y + 16}" font-family="Arial" font-size="14" fill="${color}">${asset.decision}</text>
  <text x="292" y="${y + 16}" font-family="Arial" font-size="14" fill="#4f5d75">${asset.kind}, ${asset.findings.length} finding(s)</text>`;
  }).join("\n  ")}
</svg>
`;
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
console.log(JSON.stringify(report.summary, null, 2));
