const fs = require('fs');
const path = require('path');
const { packets } = require('./sample-data');
const { evaluatePackets, formatMarkdown, formatSvg } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const reviewPacket = evaluatePackets(packets);

fs.writeFileSync(path.join(reportsDir, 'peer-review-evidence-report.json'), `${JSON.stringify(reviewPacket, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, 'peer-review-evidence-report.md'), formatMarkdown(reviewPacket));
fs.writeFileSync(path.join(reportsDir, 'peer-review-evidence-report.svg'), formatSvg(reviewPacket));

console.log(`Generated reports in ${reportsDir}`);
console.log(`Overall decision: ${reviewPacket.overallDecision}`);
