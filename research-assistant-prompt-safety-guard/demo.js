'use strict';

const fs = require('fs');
const path = require('path');
const sampleData = require('./sample-data');
const {
  evaluateResearchAssistantSafety,
  toMarkdownReport,
  toSvgSummary
} = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluateResearchAssistantSafety(sampleData);

fs.writeFileSync(
  path.join(reportsDir, 'prompt-safety-packet.json'),
  `${JSON.stringify(result, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, 'prompt-safety-report.md'),
  toMarkdownReport(result)
);
fs.writeFileSync(
  path.join(reportsDir, 'summary.svg'),
  toSvgSummary(result)
);

console.log(`status=${result.status}, blockers=${result.summary.blockers.length}, warnings=${result.summary.warnings.length}`);
