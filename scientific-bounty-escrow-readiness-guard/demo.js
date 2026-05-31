const fs = require("fs");
const path = require("path");
const {
  evaluateEscrowReadinessBatch,
  renderMarkdownReport,
  renderSvgReport,
} = require("./index");
const { challenges } = require("./sample-data");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = evaluateEscrowReadinessBatch(challenges);

fs.writeFileSync(
  path.join(reportDir, "escrow-readiness-review.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportDir, "escrow-readiness-review.md"),
  `${renderMarkdownReport(report)}\n`
);
fs.writeFileSync(
  path.join(reportDir, "escrow-readiness-review.svg"),
  renderSvgReport(report)
);

console.log(
  `wrote ${report.summary.total} escrow readiness decisions to ${path.relative(process.cwd(), reportDir)}`
);
