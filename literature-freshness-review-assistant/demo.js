const fs = require("fs");
const path = require("path");

const {
  evaluateFreshnessReview,
  renderMarkdown,
  renderSvg
} = require("./index");
const {
  freshnessPolicy,
  evidenceLedger,
  manuscriptPackets
} = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = evaluateFreshnessReview(manuscriptPackets, evidenceLedger, freshnessPolicy);
fs.writeFileSync(path.join(reportsDir, "demo.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "demo.md"), renderMarkdown(report));
fs.writeFileSync(path.join(reportsDir, "demo.svg"), renderSvg(report));

console.log(`status=${report.manuscripts[0].summary.status}`);
console.log(`reviewed=${report.aggregate.reviewedManuscripts}`);
console.log(`held=${report.aggregate.heldManuscripts}`);
console.log(`critical=${report.aggregate.criticalFindings}`);
console.log(`major=${report.aggregate.majorFindings}`);
console.log(`digest=${report.auditDigest}`);
