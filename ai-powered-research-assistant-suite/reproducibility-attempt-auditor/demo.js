const path = require("path");
const { auditReproducibility, writeAuditReports } = require("./index");
const { samplePacket } = require("./sample-data");

const report = auditReproducibility(samplePacket);
const reportsDir = path.join(__dirname, "reports");
const outputs = writeAuditReports(report, reportsDir);

console.log(`decision=${report.decision} confidenceScore=${report.confidenceScore} findings=${report.findingCount}`);
console.log(`digest=${report.evidenceDigest}`);
console.log(`reports=${reportsDir}`);
console.log(`json=${outputs.jsonPath}`);
console.log(`markdown=${outputs.markdownPath}`);
console.log(`svg=${outputs.svgPath}`);
