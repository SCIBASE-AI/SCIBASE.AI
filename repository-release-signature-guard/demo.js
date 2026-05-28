const fs = require("fs");
const path = require("path");
const { releases } = require("./sample-data");
const { reviewReleases, renderMarkdownReport, renderSvgReport } = require("./index");

function main() {
  const report = reviewReleases(releases);
  const reportDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "release-signature-review.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "release-signature-review.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportDir, "release-signature-summary.svg"), renderSvgReport(report));
  console.log("repository release signature demo generated");
  console.log(`decision summary: ${JSON.stringify(report.summary)}`);
  console.log(`reports: ${reportDir}`);
}

main();
