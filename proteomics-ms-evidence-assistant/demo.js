const fs = require("fs");
const path = require("path");
const { studies } = require("./sample-data");
const { reviewStudies, renderMarkdownReport, renderSvgReport } = require("./index");

function main() {
  const report = reviewStudies(studies);
  const reportDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "proteomics-evidence-review.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "proteomics-evidence-review.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportDir, "proteomics-evidence-summary.svg"), renderSvgReport(report));
  console.log("proteomics evidence demo generated");
  console.log(`decision summary: ${JSON.stringify(report.summary)}`);
  console.log(`reports: ${reportDir}`);
}

main();
