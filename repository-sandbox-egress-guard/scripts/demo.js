"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeSandboxRunPlans } = require("../src");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "sample_sandbox_run_plans.json");
const outDir = path.join(root, "reports");
const plans = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const report = analyzeSandboxRunPlans(plans);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Repository Sandbox Egress Guard Report",
  "",
  `Generated: ${report.generatedAt}`,
  `Execution plans analyzed: ${report.totalPlans}`,
  `Decision counts: RELEASE ${report.counts.RELEASE}, REVIEW_MERGE ${report.counts.REVIEW_MERGE}, HOLD_MERGE ${report.counts.HOLD_MERGE}`,
  "",
  "## Findings",
  "",
  ...report.results.flatMap((item) => [
    `### ${item.id}: ${item.title}`,
    "",
    `Decision: ${item.decision}`,
    `Pipeline: ${item.pipeline || "not declared"}`,
    "",
    item.findings.length === 0
      ? "- No sandbox egress or containment risk detected."
      : item.findings.map((finding) => `- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`).join("\n"),
    "",
    "Recommended actions:",
    ...item.recommendedActions.map((action) => `- ${action}`),
    ""
  ])
].join("\n");

fs.writeFileSync(path.join(outDir, "reviewer-packet.md"), markdown);

const total = Math.max(1, report.totalPlans);
const maxBar = 620;
const holdWidth = Math.round((report.counts.HOLD_MERGE / total) * maxBar);
const reviewWidth = Math.round((report.counts.REVIEW_MERGE / total) * maxBar);
const releaseWidth = Math.round((report.counts.RELEASE / total) * maxBar);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
  <rect width="900" height="520" fill="#f7fbff"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#172033">Repository Sandbox Egress Guard</text>
  <text x="56" y="118" font-family="Arial, sans-serif" font-size="19" fill="#40506a">Synthetic reproducibility-run audit before protected merge or DOI release.</text>
  <text x="56" y="180" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#172033">Decision distribution</text>
  <text x="56" y="235" font-family="Arial, sans-serif" font-size="20" fill="#172033">HOLD</text>
  <rect x="180" y="212" width="${holdWidth}" height="32" rx="4" fill="#d34b3f"/>
  <text x="${190 + holdWidth}" y="235" font-family="Arial, sans-serif" font-size="18" fill="#172033">${report.counts.HOLD_MERGE}</text>
  <text x="56" y="295" font-family="Arial, sans-serif" font-size="20" fill="#172033">REVIEW</text>
  <rect x="180" y="272" width="${reviewWidth}" height="32" rx="4" fill="#d99a2b"/>
  <text x="${190 + reviewWidth}" y="295" font-family="Arial, sans-serif" font-size="18" fill="#172033">${report.counts.REVIEW_MERGE}</text>
  <text x="56" y="355" font-family="Arial, sans-serif" font-size="20" fill="#172033">RELEASE</text>
  <rect x="180" y="332" width="${releaseWidth}" height="32" rx="4" fill="#2270a8"/>
  <text x="${190 + releaseWidth}" y="355" font-family="Arial, sans-serif" font-size="18" fill="#172033">${report.counts.RELEASE}</text>
  <text x="56" y="430" font-family="Arial, sans-serif" font-size="18" fill="#40506a">Checks egress, secrets, image pins, host mounts, root/privileged mode, resource caps, and output paths.</text>
  <text x="56" y="468" font-family="Arial, sans-serif" font-size="16" fill="#5f6e83">Synthetic generated artifact only. No desktop capture or private data.</text>
</svg>
`;

fs.writeFileSync(path.join(outDir, "summary.svg"), svg);

console.log(JSON.stringify({
  plans: report.totalPlans,
  counts: report.counts,
  outputs: [
    path.join(outDir, "summary.json"),
    path.join(outDir, "reviewer-packet.md"),
    path.join(outDir, "summary.svg")
  ]
}, null, 2));
