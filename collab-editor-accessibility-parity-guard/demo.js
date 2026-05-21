'use strict';

const fs = require('fs');
const path = require('path');
const sampleData = require('./sample-data');
const {
  evaluateAccessibilityParity,
  toMarkdownReport,
  toSvgSummary
} = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluateAccessibilityParity(sampleData);

fs.writeFileSync(
  path.join(reportsDir, 'accessibility-parity-packet.json'),
  `${JSON.stringify(result, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, 'accessibility-parity-report.md'),
  toMarkdownReport(result)
);
fs.writeFileSync(
  path.join(reportsDir, 'summary.svg'),
  toSvgSummary(result)
);

console.log(`status=${result.status}, blockers=${result.summary.blockers.length}, warnings=${result.summary.warnings.length}`);
