const fs = require("node:fs");
const path = require("node:path");
const {buildMarkdownReport, buildSummarySvg, evaluatePromotionControls, money} = require("./index");
const {sampleData} = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, {recursive: true});

const result = evaluatePromotionControls(sampleData);
const packetPath = path.join(reportsDir, "promotion-abuse-packet.json");
const reportPath = path.join(reportsDir, "promotion-abuse-report.md");
const svgPath = path.join(reportsDir, "summary.svg");

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(reportPath, buildMarkdownReport(result));
fs.writeFileSync(svgPath, buildSummarySvg(result));

console.log("Trial promotion abuse guard demo");
console.log(`Digest: ${result.digest}`);
console.log(`Events reviewed: ${result.metrics.totalEvents}`);
console.log(`Approved: ${result.metrics.approvedEvents}`);
console.log(`Held: ${result.metrics.heldEvents}`);
console.log(`Rejected: ${result.metrics.rejectedEvents}`);
console.log(`Discount leakage prevented: ${money(result.metrics.discountLeakagePreventedCents)}`);
console.log(`Wrote ${path.relative(process.cwd(), packetPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), reportPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), svgPath)}`);
