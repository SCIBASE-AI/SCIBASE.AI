const fs = require("node:fs");
const path = require("node:path");
const { evaluateChemicalIdentityGraph } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const clean = evaluateChemicalIdentityGraph(cleanPacket);
const risky = evaluateChemicalIdentityGraph(riskyPacket);

function writeJson(name, value) {
  fs.writeFileSync(path.join(reportsDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findingTable(report) {
  return report.findings
    .slice(0, 12)
    .map((finding) => `| ${finding.severity} | ${finding.code} | ${finding.action} |`)
    .join("\n");
}

function writeHandoff(report) {
  const lines = [
    "# Chemical Identity Graph Handoff",
    "",
    `Decision: ${report.summary.decision}`,
    `Compounds reviewed: ${report.summary.compoundsReviewed}`,
    `Edges reviewed: ${report.summary.edgesReviewed}`,
    `Held nodes: ${report.summary.heldNodes}`,
    `Held edges: ${report.summary.heldEdges}`,
    `Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Priority Findings",
    "",
    "| Severity | Code | Remediation |",
    "| --- | --- | --- |",
    findingTable(report),
    "",
    "## Node Actions",
    "",
    "| Compound | Status | Actions |",
    "| --- | --- | --- |",
    ...report.compounds.map((node) => `| ${node.id} | ${node.status} | ${node.actions.join(", ") || "none"} |`),
    "",
    "## Edge Actions",
    "",
    "| Edge | Status | Actions |",
    "| --- | --- | --- |",
    ...report.edges.map((edge) => `| ${edge.id} | ${edge.status} | ${edge.actions.join(", ") || "none"} |`),
    ""
  ];
  fs.writeFileSync(path.join(reportsDir, "risky-chemical-identity-handoff.md"), `${lines.join("\n")}\n`);
}

function writeSvg(cleanReport, riskyReport) {
  const width = 960;
  const height = 540;
  const findingWidth = Math.round((riskyReport.summary.findingCount / 16) * 300);
  const criticalWidth = Math.round((riskyReport.summary.criticalFindings / 5) * 300);
  const heldWidth = Math.round(((riskyReport.summary.heldNodes + riskyReport.summary.heldEdges) / 8) * 300);
  const rows = riskyReport.findings.slice(0, 8).map((finding, index) => {
    const y = 244 + index * 26;
    const color = finding.severity === "critical" ? "#991b1b" : finding.severity === "high" ? "#dc2626" : finding.severity === "medium" ? "#d97706" : "#64748b";
    return `<g><rect x="540" y="${y - 15}" width="12" height="12" rx="2" fill="${color}"/><text x="562" y="${y - 5}" font-size="14" fill="#334155">${escapeXml(finding.code)}</text></g>`;
  }).join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <rect x="48" y="44" width="864" height="452" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="48" y="44" width="864" height="8" rx="4" fill="#0f172a"/>
  <text x="84" y="92" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">Chemical identity stereochemistry guard</text>
  <text x="84" y="124" font-family="Arial, sans-serif" font-size="15" fill="#475569">Checks compound graph nodes before merge or recommendation publication.</text>
  <text x="96" y="178" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Clean graph findings</text>
  <rect x="96" y="194" width="300" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="96" y="194" width="${Math.max(4, cleanReport.summary.findingCount * 18)}" height="34" rx="4" fill="#10b981"/>
  <text x="412" y="216" font-family="Arial, sans-serif" font-size="14" fill="#0f172a">${cleanReport.summary.findingCount} findings</text>
  <text x="96" y="268" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Risky critical findings</text>
  <rect x="96" y="284" width="300" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="96" y="284" width="${criticalWidth}" height="34" rx="4" fill="#ef4444"/>
  <text x="412" y="306" font-family="Arial, sans-serif" font-size="14" fill="#0f172a">${riskyReport.summary.criticalFindings} critical</text>
  <text x="96" y="358" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Held nodes and edges</text>
  <rect x="96" y="374" width="300" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="96" y="374" width="${heldWidth}" height="34" rx="4" fill="#f59e0b"/>
  <text x="412" y="396" font-family="Arial, sans-serif" font-size="14" fill="#0f172a">${riskyReport.summary.heldNodes + riskyReport.summary.heldEdges} held</text>
  <rect x="96" y="430" width="${findingWidth}" height="14" rx="3" fill="#2563eb"/>
  <text x="540" y="178" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Top blockers</text>
  ${rows}
  <text x="540" y="462" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Decision: ${escapeXml(riskyReport.summary.decision)} | ${riskyReport.summary.auditDigest.slice(0, 28)}...</text>
</svg>
`;
  fs.writeFileSync(path.join(reportsDir, "chemical-identity-dashboard.svg"), svg);
}

writeJson("clean-chemical-identity-report.json", clean);
writeJson("risky-chemical-identity-report.json", risky);
writeHandoff(risky);
writeSvg(clean, risky);

console.log("Wrote chemical identity stereochemistry guard reports:");
console.log(`- ${path.join(reportsDir, "clean-chemical-identity-report.json")}`);
console.log(`- ${path.join(reportsDir, "risky-chemical-identity-report.json")}`);
console.log(`- ${path.join(reportsDir, "risky-chemical-identity-handoff.md")}`);
console.log(`- ${path.join(reportsDir, "chemical-identity-dashboard.svg")}`);
