import fs from "node:fs";
import path from "node:path";
import { cleanSubmissionPacket, riskySubmissionPacket } from "./src/samplePackets.js";
import { evaluateCoverLetterExportPacket, renderMarkdownReport } from "./src/guard.js";

const reportsDir = path.join(process.cwd(), "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const cleanResult = evaluateCoverLetterExportPacket(cleanSubmissionPacket);
const riskyResult = evaluateCoverLetterExportPacket(riskySubmissionPacket);

fs.writeFileSync(path.join(reportsDir, "clean-review.json"), `${JSON.stringify(cleanResult, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-review.json"), `${JSON.stringify(riskyResult, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-review.md"), renderMarkdownReport(riskySubmissionPacket, riskyResult));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#101827"/>
  <text x="48" y="76" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">Collaborative Cover-Letter Export Guard</text>
  <text x="48" y="134" fill="#fca5a5" font-family="Arial, sans-serif" font-size="28">Decision: ${riskyResult.decision}</text>
  <text x="48" y="188" fill="#d1d5db" font-family="Arial, sans-serif" font-size="23">Findings: ${riskyResult.findingCount} | High: ${riskyResult.highCount} | Medium: ${riskyResult.mediumCount}</text>
  <text x="48" y="244" fill="#d1d5db" font-family="Arial, sans-serif" font-size="22">Checks stale hashes, approval drift, claim mismatches, and private-note leakage.</text>
  <text x="48" y="304" fill="#93c5fd" font-family="Arial, sans-serif" font-size="22">Audit digest: ${riskyResult.auditDigest}</text>
</svg>
`;
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);

console.log(`Clean decision: ${cleanResult.decision}`);
console.log(`Risky decision: ${riskyResult.decision}`);
console.log(`Wrote reports to ${reportsDir}`);
