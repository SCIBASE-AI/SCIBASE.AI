const fs = require("fs");
const path = require("path");
const { quotes } = require("./sample-data");
const { reviewQuotes, renderMarkdownReport, renderSvgReport } = require("./index");

function main() {
  const report = reviewQuotes(quotes);
  const reportDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "quote-approval-review.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "quote-approval-review.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportDir, "quote-approval-summary.svg"), renderSvgReport(report));
  console.log("revenue quote approval demo generated");
  console.log(`decision summary: ${JSON.stringify(report.summary)}`);
  console.log(`reports: ${reportDir}`);
}

main();
