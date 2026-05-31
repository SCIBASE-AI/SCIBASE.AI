const fs = require('fs');
const path = require('path');
const { bundles } = require('./sample-data');
const { evaluateBundles, formatMarkdown, formatSvg } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const packet = evaluateBundles(bundles);

fs.writeFileSync(path.join(reportsDir, 'authoring-integrity-review.json'), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, 'authoring-integrity-review.md'), formatMarkdown(packet));
fs.writeFileSync(path.join(reportsDir, 'authoring-integrity-review.svg'), formatSvg(packet));

console.log(`Generated reports in ${reportsDir}`);
console.log(`Overall decision: ${packet.overallDecision}`);
