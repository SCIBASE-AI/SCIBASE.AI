'use strict';

const fs = require('fs');
const path = require('path');
const {
  analyzeSurvivalPackets,
  generateMarkdownReport,
  generateSvgReport
} = require('./assistant');

const root = __dirname;
const dataPath = path.join(root, 'data', 'survival-study-packets.json');
const artifactsDir = path.join(root, 'artifacts');

const packet = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const report = analyzeSurvivalPackets(packet);

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(path.join(artifactsDir, 'survival-review-report.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(artifactsDir, 'survival-review-report.md'), generateMarkdownReport(report));
fs.writeFileSync(path.join(artifactsDir, 'survival-review-flow.svg'), generateSvgReport(report));

console.log(`decision=${report.reviewerDecision}`);
console.log(`riskScore=${report.riskScore}`);
console.log(`findings=${report.findings.length}`);
console.log(`artifacts=${artifactsDir}`);
