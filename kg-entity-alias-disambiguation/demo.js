const fs = require("fs");
const path = require("path");
const { graphBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateBatch(graphBatch);
fs.writeFileSync(path.join(reportsDir, "entity-disambiguation-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Knowledge Graph Entity Alias Disambiguation Report",
  "",
  `Batch: ${report.batchId}`,
  `Generated: ${report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Mentions evaluated: ${report.summary.total}`,
  `- Published canonical nodes: ${report.summary["publish-canonical-node"] || 0}`,
  `- Held for curation: ${report.summary["hold-for-curation"] || 0}`,
  `- Findings: ${report.summary.findingCount}`,
  "",
  "## Mention Decisions",
  "",
  ...report.mentions.flatMap((mention) => [
    `### ${mention.mention}`,
    "",
    `- Decision: ${mention.decision}`,
    `- Canonical candidate: ${mention.canonicalCandidate} (${mention.canonicalLabel})`,
    `- Margin: ${mention.margin}`,
    `- Findings: ${mention.findings.length ? mention.findings.join("; ") : "none"}`,
    `- Actions: ${mention.actions.join("; ")}`,
    ""
  ])
].join("\n").trim();

fs.writeFileSync(path.join(reportsDir, "entity-disambiguation-report.md"), `${markdown}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="64" font-family="Arial" font-size="28" font-weight="700" fill="#172033">KG Entity Disambiguation</text>
  <text x="48" y="102" font-family="Arial" font-size="16" fill="#4f5d75">Alias collision guard before graph edge publication</text>
  ${report.mentions.map((mention, index) => {
    const y = 150 + index * 82;
    const color = mention.decision === "publish-canonical-node" ? "#047857" : "#b45309";
    return `<rect x="48" y="${y - 34}" width="864" height="58" rx="6" fill="#ffffff" stroke="#d7dce6"/>
  <text x="72" y="${y - 8}" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${mention.mention}</text>
  <text x="72" y="${y + 16}" font-family="Arial" font-size="14" fill="${color}">${mention.decision}</text>
  <text x="300" y="${y + 16}" font-family="Arial" font-size="14" fill="#4f5d75">${mention.canonicalCandidate}, margin ${mention.margin}</text>`;
  }).join("\n  ")}
</svg>
`;

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
console.log(JSON.stringify(report.summary, null, 2));
