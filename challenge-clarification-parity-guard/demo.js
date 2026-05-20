'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateChallengeClarificationParityGuard } = require('./index');
const sample = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
const report = evaluateChallengeClarificationParityGuard(sample.register);

function writeJson() {
  fs.writeFileSync(path.join(reportDir, 'challenge-clarification-parity-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown() {
  const lines = [
    '# Challenge Clarification Parity Review',
    '',
    `Checked at: ${report.checkedAt}`,
    `Overall decision: ${report.decision}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Total challenges: ${report.summary.totalChallenges}`,
    `- Publish clarifications: ${report.summary.publishClarifications}`,
    `- Publish with controls: ${report.summary.publishWithControls}`,
    `- Hold evaluation: ${report.summary.holdEvaluation}`,
    `- Reopen window: ${report.summary.reopenWindow}`,
    '',
    '## Challenge Decisions',
    '',
    '| Challenge | Clarifications | Eligible teams | Decision |',
    '| --- | ---: | ---: | --- |',
    ...report.challenges.map((challenge) => `| ${challenge.title} | ${challenge.clarificationCount} | ${challenge.eligibleTeamCount} | ${challenge.decision} |`),
    '',
    '## Operator Tasks',
    '',
    ...report.operatorTasks.map((task) => `- ${task}`),
  ];

  fs.writeFileSync(path.join(reportDir, 'challenge-clarification-parity-packet.md'), `${lines.join('\n')}\n`);
}

function writeSvg() {
  const rows = [
    ['Publish', report.summary.publishClarifications, '#2c8f64'],
    ['Controls', report.summary.publishWithControls, '#bb7d25'],
    ['Hold', report.summary.holdEvaluation, '#7856a6'],
    ['Reopen', report.summary.reopenWindow, '#b74743'],
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Challenge clarification parity report">
  <rect width="960" height="540" fill="#f5f7f6"/>
  <rect x="36" y="32" width="888" height="476" rx="10" fill="#fffffc" stroke="#cfd8d2"/>
  <text x="64" y="86" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#1f2a2e">Challenge Clarification Parity</text>
  <text x="64" y="124" font-family="Arial, sans-serif" font-size="20" fill="#5d6a6b">Sponsor Q&amp;A, attachment, scope-change, and anonymity fairness review.</text>
  <g font-family="Arial, sans-serif">
${rowSvg}
  </g>
  <rect x="64" y="420" width="420" height="52" rx="8" fill="#f8dad8" stroke="#cfd8d2"/>
  <text x="82" y="453" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#b74743">Decision: ${report.decision}</text>
  <text x="64" y="494" font-family="Arial, sans-serif" font-size="16" fill="#37669b">Digest ${report.auditDigest.slice(0, 40)}</text>
</svg>
`;

  fs.writeFileSync(path.join(reportDir, 'challenge-clarification-parity.svg'), svg);
}

function run() {
  fs.mkdirSync(reportDir, { recursive: true });
  writeJson();
  writeMarkdown();
  writeSvg();
  console.log('Generated challenge clarification parity demo artifacts:');
  console.log('- challenge-clarification-parity-guard/reports/challenge-clarification-parity-report.json');
  console.log('- challenge-clarification-parity-guard/reports/challenge-clarification-parity-packet.md');
  console.log('- challenge-clarification-parity-guard/reports/challenge-clarification-parity.svg');
}

run();
