const fs = require("fs");
const path = require("path");
const { evaluateBranchProtection, toMarkdown, toSvg } = require("./branchProtectionGuard");
const sampleRepository = require("./sampleRepository");

const result = evaluateBranchProtection(sampleRepository);
const reportDir = path.join(__dirname, "reports");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "branch-protection-packet.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(reportDir, "branch-protection-report.md"), toMarkdown(result));
fs.writeFileSync(path.join(reportDir, "summary.svg"), toSvg(result));

console.log(`decision=${result.decision}`);
console.log(`findings=${result.findings.length}`);
console.log(`reports=${reportDir}`);
