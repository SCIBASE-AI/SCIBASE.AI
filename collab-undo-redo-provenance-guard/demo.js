const fs = require("fs");
const path = require("path");
const { documentState, requests } = require("./sample-data");
const { evaluateUndoRedoBatch, renderMarkdownReport, renderSvgReport } = require("./index");

function main() {
  const report = evaluateUndoRedoBatch(documentState, requests);
  const reportDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "undo-redo-provenance-review.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "undo-redo-provenance-review.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportDir, "undo-redo-provenance-summary.svg"), renderSvgReport(report));
  console.log("undo redo provenance demo generated");
  console.log(`decision summary: ${JSON.stringify(report.summary)}`);
  console.log(`reports: ${reportDir}`);
}

main();
