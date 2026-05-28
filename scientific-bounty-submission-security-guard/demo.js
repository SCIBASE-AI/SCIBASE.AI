const fs = require("fs");
const path = require("path");
const { submissions } = require("./sample-data");
const { reviewSubmissions, renderMarkdownReport, renderSvgReport } = require("./index");

function main() {
  const report = reviewSubmissions(submissions);
  const reportDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "submission-security-review.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "submission-security-review.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportDir, "submission-security-summary.svg"), renderSvgReport(report));
  console.log("submission security demo generated");
  console.log(`decision summary: ${JSON.stringify(report.summary)}`);
  console.log(`reports: ${reportDir}`);
}

main();
