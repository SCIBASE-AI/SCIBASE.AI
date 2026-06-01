const fs = require("node:fs");
const path = require("node:path");
const { cleanPacket, riskyPacket } = require("./sample-data");
const { evaluateTrainingPolicyPacket } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const release = evaluateTrainingPolicyPacket(cleanPacket);
const hold = evaluateTrainingPolicyPacket(riskyPacket);
const combined = { generatedAt: new Date().toISOString(), scenarios: [release, hold] };

fs.writeFileSync(
  path.join(reportsDir, "training-policy-report.json"),
  JSON.stringify(combined, null, 2)
);

const markdown = [
  "# Enterprise Training Policy Guard Demo",
  "",
  `Generated: ${combined.generatedAt}`,
  "",
  "| Scenario | Decision | Blockers | Revisions | Summary |",
  "| --- | --- | ---: | ---: | --- |",
  ...combined.scenarios.map((item) =>
    `| ${item.actionId} | ${item.decision} | ${item.blockerCount} | ${item.revisionCount} | ${item.reviewerSummary} |`
  ),
  "",
  "## Hold Findings",
  "",
  ...hold.findings.map((item) =>
    `- **${item.code}** (${item.severity}) for ${item.researcherId}: ${item.message} ${item.remediation}`
  )
].join("\n");

fs.writeFileSync(path.join(reportsDir, "training-policy-report.md"), markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
  <rect width="900" height="520" fill="#0f172a"/>
  <rect x="48" y="44" width="804" height="432" rx="18" fill="#f8fafc"/>
  <text x="82" y="98" font-family="Arial" font-size="34" font-weight="700" fill="#0f172a">Enterprise Training Policy Guard</text>
  <text x="82" y="142" font-family="Arial" font-size="18" fill="#334155">Stops privileged exports when training, policy acknowledgement, or evidence receipts are stale.</text>
  <rect x="82" y="190" width="330" height="190" rx="14" fill="#dcfce7" stroke="#16a34a"/>
  <text x="112" y="240" font-family="Arial" font-size="26" font-weight="700" fill="#166534">Release</text>
  <text x="112" y="282" font-family="Arial" font-size="18" fill="#166534">2 researchers checked</text>
  <text x="112" y="316" font-family="Arial" font-size="18" fill="#166534">0 blockers / 0 revisions</text>
  <rect x="488" y="190" width="330" height="190" rx="14" fill="#fee2e2" stroke="#dc2626"/>
  <text x="518" y="240" font-family="Arial" font-size="26" font-weight="700" fill="#991b1b">Hold</text>
  <text x="518" y="282" font-family="Arial" font-size="18" fill="#991b1b">4 blockers / 2 revisions</text>
  <text x="518" y="316" font-family="Arial" font-size="18" fill="#991b1b">Missing, expired, and stale evidence</text>
  <text x="82" y="430" font-family="Arial" font-size="16" fill="#475569">Synthetic data only. No live credentials, payment systems, or private research records are used.</text>
</svg>`;

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
fs.writeFileSync(
  path.join(reportsDir, "demo-script.txt"),
  "Show the release scenario, then the restricted export hold scenario, then the remediation list."
);

console.log(JSON.stringify(combined, null, 2));
