const fs = require("fs");
const path = require("path");
const packets = require("./sample-data");
const {
  evaluateRefundBatch,
  renderMarkdownReport,
  renderSvgReport,
} = require("./index");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = evaluateRefundBatch(packets);
const jsonPath = path.join(reportDir, "refund-liability-review.json");
const markdownPath = path.join(reportDir, "refund-liability-review.md");
const svgPath = path.join(reportDir, "refund-liability-review.svg");

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdownReport(report));
fs.writeFileSync(svgPath, renderSvgReport(report));

console.log(`wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(
  `summary: ${report.summary.hold} held refunds, ${report.summary.refundableAmount} refundable`
);
