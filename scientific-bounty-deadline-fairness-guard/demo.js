const fs = require("fs");
const path = require("path");
const { challenges } = require("./sample-data");
const { evaluateChallenges, renderMarkdownReport, renderSvgReport } = require("./index");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function runDemo() {
  const report = evaluateChallenges(challenges);
  const reportDir = path.join(__dirname, "reports");
  ensureDir(reportDir);

  fs.writeFileSync(path.join(reportDir, "deadline-fairness-review.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "deadline-fairness-review.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportDir, "deadline-fairness-summary.svg"), renderSvgReport(report));

  console.log("deadline fairness demo generated");
  console.log(`decision summary: ${JSON.stringify(report.summary)}`);
  console.log(`reports: ${reportDir}`);
}

runDemo();
