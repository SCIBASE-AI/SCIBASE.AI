'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateReproducibilityFlakinessTriage } = require('./index');
const sample = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
const report = evaluateReproducibilityFlakinessTriage(sample.register);

function writeJson() {
  fs.writeFileSync(path.join(reportDir, 'reproducibility-flakiness-triage-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown() {
  const lines = [
    '# Reproducibility Flakiness Triage Packet',
    '',
    `Checked at: ${report.checkedAt}`,
    `Overall decision: ${report.decision}`,
    `Average confidence: ${report.summary.averageConfidence}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Total projects: ${report.summary.totalProjects}`,
    `- Reproducible: ${report.summary.reproducible}`,
    `- Reproducible with controls: ${report.summary.reproducibleWithControls}`,
    `- Flaky needs rerun: ${report.summary.flakyNeedsRerun}`,
    `- Not reproducible: ${report.summary.notReproducible}`,
    '',
    '## Project Decisions',
    '',
    '| Project | Runs | Confidence | Likely cause | Decision |',
    '| --- | ---: | ---: | --- | --- |',
    ...report.projects.map((project) => `| ${project.title} | ${project.runCount} | ${project.confidence} | ${project.likelyCause} | ${project.decision} |`),
    '',
    '## Assistant Tasks',
    '',
    ...report.assistantTasks.map((task) => `- ${task}`),
  ];

  fs.writeFileSync(path.join(reportDir, 'reproducibility-flakiness-triage-packet.md'), `${lines.join('\n')}\n`);
}

function writeSvg() {
  const rows = [
    ['Reproducible', report.summary.reproducible, '#2c8f64'],
    ['Controls', report.summary.reproducibleWithControls, '#bb7d25'],
    ['Rerun', report.summary.flakyNeedsRerun, '#7856a6'],
    ['Not repro', report.summary.notReproducible, '#b74743'],
  ];
  const max = Math.max(...rows.map((row) => row[1]), 1);
  const rowSvg = rows.map((row, index) => {
    const y = 180 + index * 54;
    const width = Math.round((row[1] / max) * 420);
    return [
      `<text x="64" y="${y}" font-size="22" fill="#304044">${row[0]}</text>`,
      `<rect x="250" y="${y - 22}" width="420" height="24" rx="6" fill="#e5ecea"/>`,
      `<rect x="250" y="${y - 22}" width="${width}" height="24" rx="6" fill="${row[2]}"/>`,
      `<text x="700" y="${y}" font-size="22" fill="${row[2]}">${row[1]}</text>`,
    ].join('\n');
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Reproducibility flakiness triage report">
  <rect width="960" height="540" fill="#f5f7f6"/>
  <rect x="36" y="32" width="888" height="476" rx="10" fill="#fffffc" stroke="#cfd8d2"/>
  <text x="64" y="86" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#1f2a2e">Reproducibility Flakiness Triage</text>
  <text x="64" y="124" font-family="Arial, sans-serif" font-size="20" fill="#5d6a6b">Repeated-run output drift, environment drift, dependency, and prior failure localization.</text>
  <g font-family="Arial, sans-serif">
${rowSvg}
  </g>
  <rect x="64" y="420" width="420" height="52" rx="8" fill="#f8dad8" stroke="#cfd8d2"/>
  <text x="82" y="453" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#b74743">Decision: ${report.decision}</text>
  <text x="64" y="494" font-family="Arial, sans-serif" font-size="16" fill="#37669b">Digest ${report.auditDigest.slice(0, 40)}</text>
</svg>
`;

  fs.writeFileSync(path.join(reportDir, 'reproducibility-flakiness-triage.svg'), svg);
}

function run() {
  fs.mkdirSync(reportDir, { recursive: true });
  writeJson();
  writeMarkdown();
  writeSvg();
  console.log('Generated reproducibility flakiness triage demo artifacts:');
  console.log('- reproducibility-flakiness-triage-assistant/reports/reproducibility-flakiness-triage-report.json');
  console.log('- reproducibility-flakiness-triage-assistant/reports/reproducibility-flakiness-triage-packet.md');
  console.log('- reproducibility-flakiness-triage-assistant/reports/reproducibility-flakiness-triage.svg');
}

run();
