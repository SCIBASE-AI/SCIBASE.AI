const fs = require('node:fs');
const path = require('node:path');
const { evaluatePortfolio, renderMarkdownReport } = require('./index');
const sample = require('./sample-data.json');

const results = evaluatePortfolio(sample);
const report = renderMarkdownReport(results);
const outDir = path.join(__dirname, 'artifacts');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'grant-milestone-release-report.md'), report);
fs.writeFileSync(path.join(outDir, 'grant-milestone-release-results.json'), `${JSON.stringify(results, null, 2)}\n`);

console.log(report);
console.log(`Artifacts written to ${outDir}`);
