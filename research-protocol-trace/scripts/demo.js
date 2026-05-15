const fs = require("node:fs");
const path = require("node:path");
const { buildProtocolTraceReport } = require("../src/protocol-trace");

const samplePath = path.join(__dirname, "..", "data", "sample-study.json");
const study = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = buildProtocolTraceReport(study);

console.log(`Protocol trace score: ${report.overallScore} (${report.decision})`);
console.log(`Registered protocol: ${report.registrationId}`);
console.log(`Claims traced: ${report.claims.length}`);
console.log(`Selective reporting status: ${report.selectiveReporting.status}`);
console.log(`Unreported registered outcomes: ${report.unreportedOutcomes.length}`);
console.log(`Top reviewer action: ${report.peerReview.actionItems[0].prompt}`);
console.log(`Top research gap: ${report.researchGaps[0].title}`);
console.log(`Digest: ${report.digest}`);
