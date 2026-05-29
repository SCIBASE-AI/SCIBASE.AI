const fs = require("fs");
const path = require("path");
const { manuscript } = require("./sample-data");
const { evaluateManuscript } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateManuscript(manuscript);
fs.writeFileSync(path.join(reportsDir, "claim-evidence-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Manuscript Claim/Evidence Alignment Report",
  "",
  `Manuscript: ${report.title}`,
  `Generated: ${report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Claims evaluated: ${report.summary.total}`,
  `- Supported: ${report.summary.supported || 0}`,
  `- Weakly supported: ${report.summary["weakly-supported"] || 0}`,
  `- Overclaimed: ${report.summary.overclaimed || 0}`,
  `- Missing evidence: ${report.summary["missing-evidence"] || 0}`,
  "",
  "## Claim Decisions",
  "",
  ...report.claims.flatMap((claim) => [
    `### ${claim.id}`,
    "",
    `- Decision: ${claim.decision}`,
    `- Claim: ${claim.text}`,
    `- Linked evidence: ${claim.linkedEvidence.join(", ") || "none"}`,
    `- Findings: ${claim.findings.length ? claim.findings.join("; ") : "none"}`,
    `- Actions: ${claim.actions.join("; ")}`,
    ""
  ])
].join("\n").trim();

fs.writeFileSync(path.join(reportsDir, "claim-evidence-report.md"), `${markdown}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#fbfaf7"/>
  <text x="48" y="64" font-family="Arial" font-size="28" font-weight="700" fill="#172033">Claim/Evidence Alignment</text>
  <text x="48" y="102" font-family="Arial" font-size="16" fill="#4f5d75">AI research assistant pre-release guard</text>
  ${report.claims.map((claim, index) => {
    const y = 150 + index * 82;
    const color = claim.decision === "supported" ? "#047857" : claim.decision === "overclaimed" ? "#c2410c" : "#b45309";
    return `<rect x="48" y="${y - 34}" width="864" height="58" rx="6" fill="#ffffff" stroke="#d7dce6"/>
  <text x="72" y="${y - 8}" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${claim.id}</text>
  <text x="72" y="${y + 16}" font-family="Arial" font-size="14" fill="${color}">${claim.decision}</text>
  <text x="260" y="${y + 16}" font-family="Arial" font-size="14" fill="#4f5d75">${claim.findings.length} finding(s), ${claim.evidenceRefs.length} evidence ref(s)</text>`;
  }).join("\n  ")}
</svg>
`;

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
console.log(JSON.stringify(report.summary, null, 2));
