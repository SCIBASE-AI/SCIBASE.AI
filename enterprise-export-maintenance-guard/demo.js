import fs from "node:fs";
import path from "node:path";
import { readyExportJob, riskyExportJob } from "./src/sampleJobs.js";
import { evaluateExportMaintenanceJob, renderMarkdownReport } from "./src/guard.js";

const reportsDir = path.join(process.cwd(), "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const readyResult = evaluateExportMaintenanceJob(readyExportJob);
const riskyResult = evaluateExportMaintenanceJob(riskyExportJob);

fs.writeFileSync(path.join(reportsDir, "ready-export.json"), `${JSON.stringify(readyResult, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-export.json"), `${JSON.stringify(riskyResult, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-export.md"), renderMarkdownReport(riskyExportJob, riskyResult));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#0f172a"/>
  <text x="48" y="78" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">Enterprise Export Maintenance Guard</text>
  <text x="48" y="136" fill="#fca5a5" font-family="Arial, sans-serif" font-size="28">Decision: ${riskyResult.decision}</text>
  <text x="48" y="190" fill="#d1d5db" font-family="Arial, sans-serif" font-size="23">Findings: ${riskyResult.findingCount} | High: ${riskyResult.highCount} | Medium: ${riskyResult.mediumCount}</text>
  <text x="48" y="246" fill="#d1d5db" font-family="Arial, sans-serif" font-size="22">Checks maintenance windows, degraded health, stale evidence, and retry policy.</text>
  <text x="48" y="306" fill="#93c5fd" font-family="Arial, sans-serif" font-size="22">Audit digest: ${riskyResult.auditDigest}</text>
</svg>
`;
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);

console.log(`Ready decision: ${readyResult.decision}`);
console.log(`Risky decision: ${riskyResult.decision}`);
console.log(`Wrote reports to ${reportsDir}`);
