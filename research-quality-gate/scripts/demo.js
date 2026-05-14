'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildQualityGate, renderMarkdownReport } = require('../src/quality-gate');

const projectPath = path.join(__dirname, '..', 'data', 'sample-project.json');
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
const gate = buildQualityGate(project);

console.log(`Decision: ${gate.decision}`);
console.log(`Readiness score: ${gate.readinessScore}`);
console.log(`Evidence score: ${gate.evidenceAlignment.score}`);
console.log(`Peer-review risks: ${gate.peerReview.risks.length}`);
console.log(`Reproducibility score: ${gate.reproducibility.score}`);
console.log(`Top action: ${gate.nextActions[0] || 'No required action.'}`);
console.log(`Top research gap: ${gate.gapFinder.topOpportunity.title}`);
console.log('');
console.log(renderMarkdownReport(gate));
