const fs = require("fs");
const path = require("path");
const cohorts = require("./sample-data");
const {
  evaluateCohortBatch,
  renderMarkdownReport,
  renderSvgReport,
} = require("./index");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = evaluateCohortBatch(cohorts);
const jsonPath = path.join(reportDir, "leaderboard-cohort-privacy-review.json");
const markdownPath = path.join(reportDir, "leaderboard-cohort-privacy-review.md");
const svgPath = path.join(reportDir, "leaderboard-cohort-privacy-review.svg");

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdownReport(report));
fs.writeFileSync(svgPath, renderSvgReport(report));

console.log(`wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(
  `summary: ${report.summary.publish} publish, ${report.summary.redact} redact, ${report.summary.hold} hold`
);
