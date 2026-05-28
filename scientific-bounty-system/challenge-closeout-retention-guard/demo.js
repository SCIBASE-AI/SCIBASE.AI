'use strict';

const fs = require('fs');
const path = require('path');
const {
  analyzeCloseoutRecords,
  renderMarkdown,
  renderSvg
} = require('./guard');

const root = __dirname;
const packetPath = path.join(root, 'data', 'closeout-records.json');
const artifactsDir = path.join(root, 'artifacts');
const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
const report = analyzeCloseoutRecords(packet);

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(path.join(artifactsDir, 'closeout-report.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(artifactsDir, 'closeout-report.md'), renderMarkdown(report));
fs.writeFileSync(path.join(artifactsDir, 'closeout-summary.svg'), renderSvg(report));

console.log(`decision=${report.decision}`);
console.log(`riskScore=${report.riskScore}`);
console.log(`findings=${report.findings.length}`);
console.log(`artifacts=${artifactsDir}`);
