const fs = require("fs");
const path = require("path");
const { evaluateMentionFanout, toMarkdown, toSvg } = require("./mentionScopeGuard");
const sampleWorkspace = require("./sampleWorkspace");

const result = evaluateMentionFanout(sampleWorkspace);
const reportDir = path.join(__dirname, "reports");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "mention-scope-packet.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(reportDir, "mention-scope-report.md"), toMarkdown(result));
fs.writeFileSync(path.join(reportDir, "summary.svg"), toSvg(result));

console.log(`decision=${result.decision}`);
console.log(`findings=${result.findings.length}`);
console.log(`reports=${reportDir}`);
