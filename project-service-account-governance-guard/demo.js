'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateServiceAccountGovernance } = require('./index');
const sample = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
const report = evaluateServiceAccountGovernance({
  checkedAt: sample.checkedAt,
  humanOwners: sample.humanOwners,
  sponsors: sample.sponsors,
  serviceAccounts: sample.serviceAccounts,
});

function writeJson() {
  fs.writeFileSync(path.join(reportDir, 'service-account-governance-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown() {
  const lines = [
    '# Project Service Account Governance Review',
    '',
    `Checked at: ${report.checkedAt}`,
    `Overall decision: ${report.decision}`,
    `Access hold: ${report.accessHold ? 'yes' : 'no'}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Total accounts: ${report.summary.totalAccounts}`,
    `- Approved: ${report.summary.approved}`,
    `- Needs rotation: ${report.summary.needsRotation}`,
    `- Suspended: ${report.summary.suspended}`,
    `- Revoked: ${report.summary.revoked}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Account Decisions',
    '',
    '| Account | Project | Owner | Decision | Action | Scopes |',
    '| --- | --- | --- | --- | --- | ---: |',
    ...report.accounts.map((account) => `| ${account.accountId} | ${account.projectId} | ${account.ownerId} | ${account.decision} | ${account.action} | ${account.scopeCount} |`),
    '',
    '## Reviewer Tasks',
    '',
    ...report.reviewerTasks.map((task) => `- ${task}`),
  ];

  fs.writeFileSync(path.join(reportDir, 'service-account-review-packet.md'), `${lines.join('\n')}\n`);
}

function bar(value, max, width) {
  if (!max) {
    return 0;
  }
  return Math.round((value / max) * width);
}

function writeSvg() {
  const max = Math.max(
    report.summary.approved,
    report.summary.needsRotation,
    report.summary.suspended,
    report.summary.revoked,
    1
  );
  const rows = [
    ['Approved', report.summary.approved, '#2d8f5f'],
    ['Needs rotation', report.summary.needsRotation, '#c07f25'],
    ['Suspended', report.summary.suspended, '#b74f3f'],
    ['Revoked', report.summary.revoked, '#8e3b46'],
  ];
  const rowSvg = rows.map((row, index) => {
    const y = 170 + index * 54;
    const width = bar(row[1], max, 420);
    return [
      `<text x="64" y="${y}" font-size="22" fill="#304044">${row[0]}</text>`,
      `<rect x="248" y="${y - 22}" width="420" height="24" rx="6" fill="#e8eee8"/>`,
      `<rect x="248" y="${y - 22}" width="${width}" height="24" rx="6" fill="${row[2]}"/>`,
      `<text x="696" y="${y}" font-size="22" fill="${row[2]}">${row[1]}</text>`,
    ].join('\n');
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Project service account governance report">
  <rect width="960" height="540" fill="#f6f8f4"/>
  <rect x="36" y="32" width="888" height="476" rx="10" fill="#fffffc" stroke="#cfd8d2"/>
  <text x="64" y="86" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#1f2a2e">Service Account Governance Guard</text>
  <text x="64" y="124" font-family="Arial, sans-serif" font-size="20" fill="#5d6a6b">Owner, sponsor, token, scope, and external integration review for project automation.</text>
  <g font-family="Arial, sans-serif">
${rowSvg}
  </g>
  <rect x="64" y="414" width="306" height="52" rx="8" fill="${report.accessHold ? '#f8dad8' : '#dbf1e5'}" stroke="#cfd8d2"/>
  <text x="82" y="447" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${report.accessHold ? '#b44343' : '#2a8e5b'}">Access hold: ${report.accessHold ? 'ON' : 'OFF'}</text>
  <text x="64" y="488" font-family="Arial, sans-serif" font-size="16" fill="#37669b">Digest ${report.auditDigest.slice(0, 40)}</text>
</svg>
`;

  fs.writeFileSync(path.join(reportDir, 'service-account-governance.svg'), svg);
}

function run() {
  fs.mkdirSync(reportDir, { recursive: true });
  writeJson();
  writeMarkdown();
  writeSvg();
  console.log('Generated project service account governance demo artifacts:');
  console.log('- project-service-account-governance-guard/reports/service-account-governance-report.json');
  console.log('- project-service-account-governance-guard/reports/service-account-review-packet.md');
  console.log('- project-service-account-governance-guard/reports/service-account-governance.svg');
}

run();
