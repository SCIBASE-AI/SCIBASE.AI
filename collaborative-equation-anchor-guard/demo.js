const fs = require("fs");
const path = require("path");
const {
  evaluateEquationAnchorBatch,
  renderMarkdownReport,
  renderSvgReport,
} = require("./index");
const { sessions } = require("./sample-data");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = evaluateEquationAnchorBatch(sessions);

fs.writeFileSync(
  path.join(reportDir, "equation-anchor-review.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportDir, "equation-anchor-review.md"),
  `${renderMarkdownReport(report)}\n`
);
fs.writeFileSync(
  path.join(reportDir, "equation-anchor-review.svg"),
  renderSvgReport(report)
);

console.log(
  `wrote ${report.summary.total} equation anchor decisions to ${path.relative(process.cwd(), reportDir)}`
);
