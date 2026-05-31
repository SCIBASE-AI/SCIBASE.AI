const fs = require('fs');
const path = require('path');
const {
  evaluateScopeChangeControl,
  formatMarkdownReport,
  formatSvgSummary
} = require('./index');
const { reviewInput } = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const evaluation = evaluateScopeChangeControl(reviewInput);

fs.writeFileSync(
  path.join(reportsDir, 'scope-change-review.json'),
  `${JSON.stringify(evaluation, null, 2)}\n`
);
fs.writeFileSync(path.join(reportsDir, 'scope-change-review.md'), formatMarkdownReport(evaluation));
fs.writeFileSync(path.join(reportsDir, 'scope-change-review.svg'), formatSvgSummary(evaluation));

console.log(`Generated reports in ${reportsDir}`);
console.log(`Overall decision: ${evaluation.overallDecision}`);

