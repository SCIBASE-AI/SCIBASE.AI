const fs = require("fs");
const path = require("path");
const { manuscripts, targetStyles } = require("./sample-data");
const { reviewManuscripts, renderMarkdownReport, renderSvgReport } = require("./index");

function main() {
  const report = reviewManuscripts(manuscripts, targetStyles);
  const reportDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "journal-style-review.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "journal-style-review.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportDir, "journal-style-summary.svg"), renderSvgReport(report));
  console.log("collaborative journal style demo generated");
  console.log(`decision summary: ${JSON.stringify(report.summary)}`);
  console.log(`reports: ${reportDir}`);
}

main();
