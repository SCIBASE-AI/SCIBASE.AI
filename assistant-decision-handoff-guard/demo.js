const fs = require("fs");
const path = require("path");
const packets = require("./sample-data");
const {
  evaluateHandoffBatch,
  renderMarkdownReport,
  renderSvgReport,
} = require("./index");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = evaluateHandoffBatch(packets);
const jsonPath = path.join(reportDir, "assistant-handoff-review.json");
const markdownPath = path.join(reportDir, "assistant-handoff-review.md");
const svgPath = path.join(reportDir, "assistant-handoff-review.svg");

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdownReport(report));
fs.writeFileSync(svgPath, renderSvgReport(report));

console.log(`wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(
  `summary: ${report.summary.release} release, ${report.summary.revise} revise, ${report.summary.hold} hold`
);
