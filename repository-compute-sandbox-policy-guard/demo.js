const fs = require("node:fs");
const path = require("node:path");
const {
  createPolicyReport,
  renderMarkdown,
  renderSvg,
} = require("./index");
const { sampleCandidates } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = createPolicyReport(sampleCandidates);
const jsonPath = path.join(reportsDir, "demo.json");
const markdownPath = path.join(reportsDir, "demo.md");
const svgPath = path.join(reportsDir, "demo.svg");

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdown(report));
fs.writeFileSync(svgPath, renderSvg(report));

console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(
  `Ready=${report.totals.ready} NeedsReview=${report.totals.needsReview} Blocked=${report.totals.blocked}`,
);
