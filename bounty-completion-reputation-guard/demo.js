const fs = require("fs");
const path = require("path");
const { completions } = require("./sample-data");
const { reviewCompletions, renderMarkdownReport, renderSvgReport } = require("./index");

function main() {
  const report = reviewCompletions(completions);
  const reportDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "bounty-reputation-review.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "bounty-reputation-review.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportDir, "bounty-reputation-summary.svg"), renderSvgReport(report));
  console.log("bounty completion reputation demo generated");
  console.log(`decision summary: ${JSON.stringify(report.summary)}`);
  console.log(`reports: ${reportDir}`);
}

main();
