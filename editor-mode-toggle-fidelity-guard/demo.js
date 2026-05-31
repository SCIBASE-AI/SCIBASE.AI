const fs = require("fs");
const path = require("path");
const { evaluateModeToggle, toMarkdown, toSvg } = require("./modeToggleGuard");
const sampleSnapshot = require("./sampleSnapshot");

const result = evaluateModeToggle(sampleSnapshot);
const reportDir = path.join(__dirname, "reports");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "mode-toggle-packet.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(reportDir, "mode-toggle-report.md"), toMarkdown(result));
fs.writeFileSync(path.join(reportDir, "summary.svg"), toSvg(result));

console.log(`decision=${result.decision}`);
console.log(`findings=${result.findings.length}`);
console.log(`reports=${reportDir}`);
