const fs = require("fs");
const path = require("path");
const { evaluateIdentityTrust, renderMarkdownReport, renderSvgSummary } = require("./index");
const { impersonationProfile, reviewContext } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = evaluateIdentityTrust(impersonationProfile, reviewContext);
fs.writeFileSync(path.join(outputDir, "identity-impersonation-review.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "identity-impersonation-review.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "identity-impersonation-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
