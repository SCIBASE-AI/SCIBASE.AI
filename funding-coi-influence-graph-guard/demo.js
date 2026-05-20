'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateFundingCoiInfluenceGraph } = require('./index');
const sample = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
const report = evaluateFundingCoiInfluenceGraph(sample.graph);

function writeJson() {
  fs.writeFileSync(path.join(reportDir, 'funding-coi-graph-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown() {
  const lines = [
    '# Funding and COI Influence Graph Review',
    '',
    `Checked at: ${report.checkedAt}`,
    `Overall decision: ${report.decision}`,
    `Recommendation hold: ${report.recommendationHold ? 'yes' : 'no'}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Total works: ${report.summary.totalWorks}`,
    `- Publish: ${report.summary.publish}`,
    `- Annotate: ${report.summary.annotate}`,
    `- Suppress recommendations: ${report.summary.suppressRecommendation}`,
    `- Quarantine: ${report.summary.quarantine}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Work Decisions',
    '',
    '| Work | Decision | Funding edges | Largest funder share | Disclosure coverage |',
    '| --- | --- | ---: | ---: | ---: |',
    ...report.works.map((work) => `| ${work.label} | ${work.decision} | ${work.fundingEdgeCount} | ${work.largestFunderShare} | ${work.disclosureCoverage} |`),
    '',
    '## Curator Tasks',
    '',
    ...report.curatorTasks.map((task) => `- ${task}`),
  ];

  fs.writeFileSync(path.join(reportDir, 'funding-coi-review-packet.md'), `${lines.join('\n')}\n`);
}

function writeSvg() {
  const rows = [
    ['Publish', report.summary.publish, '#2d8f5f'],
    ['Annotate', report.summary.annotate, '#c07f25'],
    ['Suppress', report.summary.suppressRecommendation, '#7e4f84'],
    ['Quarantine', report.summary.quarantine, '#b44343'],
  ];
  const max = Math.max(...rows.map((row) => row[1]), 1);
  const rowSvg = rows.map((row, index) => {
    const y = 170 + index * 54;
    const width = Math.round((row[1] / max) * 420);
    return [
      `<text x="64" y="${y}" font-size="22" fill="#304044">${row[0]}</text>`,
      `<rect x="248" y="${y - 22}" width="420" height="24" rx="6" fill="#e8eee8"/>`,
      `<rect x="248" y="${y - 22}" width="${width}" height="24" rx="6" fill="${row[2]}"/>`,
      `<text x="696" y="${y}" font-size="22" fill="${row[2]}">${row[1]}</text>`,
    ].join('\n');
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Funding and COI influence graph report">
  <rect width="960" height="540" fill="#f6f8f4"/>
  <rect x="36" y="32" width="888" height="476" rx="10" fill="#fffffc" stroke="#cfd8d2"/>
  <text x="64" y="86" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#1f2a2e">Funding COI Influence Graph</text>
  <text x="64" y="124" font-family="Arial, sans-serif" font-size="20" fill="#5d6a6b">Funder, sponsor, institution, author, dataset, and publication edge review.</text>
  <g font-family="Arial, sans-serif">
${rowSvg}
  </g>
  <rect x="64" y="414" width="360" height="52" rx="8" fill="${report.recommendationHold ? '#f8dad8' : '#dbf1e5'}" stroke="#cfd8d2"/>
  <text x="82" y="447" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${report.recommendationHold ? '#b44343' : '#2a8e5b'}">Recommendation hold: ${report.recommendationHold ? 'ON' : 'OFF'}</text>
  <text x="64" y="488" font-family="Arial, sans-serif" font-size="16" fill="#37669b">Digest ${report.auditDigest.slice(0, 40)}</text>
</svg>
`;

  fs.writeFileSync(path.join(reportDir, 'funding-coi-graph.svg'), svg);
}

function run() {
  fs.mkdirSync(reportDir, { recursive: true });
  writeJson();
  writeMarkdown();
  writeSvg();
  console.log('Generated funding/COI influence graph demo artifacts:');
  console.log('- funding-coi-influence-graph-guard/reports/funding-coi-graph-report.json');
  console.log('- funding-coi-influence-graph-guard/reports/funding-coi-review-packet.md');
  console.log('- funding-coi-influence-graph-guard/reports/funding-coi-graph.svg');
}

run();
