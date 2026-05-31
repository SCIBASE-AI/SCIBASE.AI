const fs = require("fs");
const path = require("path");
const { evaluateCancellationPacket, toMarkdown, toSvg } = require("./cancellationGuard");
const samplePacket = require("./samplePacket");

const result = evaluateCancellationPacket(samplePacket);
const reportDir = path.join(__dirname, "reports");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "cancellation-packet.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(reportDir, "cancellation-report.md"), toMarkdown(result));
fs.writeFileSync(path.join(reportDir, "summary.svg"), toSvg(result));

console.log(`decision=${result.decision}`);
console.log(`findings=${result.findings.length}`);
console.log(`reports=${reportDir}`);
