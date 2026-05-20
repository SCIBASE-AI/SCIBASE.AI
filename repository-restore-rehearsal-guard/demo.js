'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateRepositoryRestoreRehearsals } = require('./index');
const sample = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
const report = evaluateRepositoryRestoreRehearsals({
  checkedAt: sample.checkedAt,
  snapshots: sample.snapshots,
});

function writeJson() {
  fs.writeFileSync(path.join(reportDir, 'restore-rehearsal-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown() {
  const lines = [
    '# Repository Restore Rehearsal Review',
    '',
    `Checked at: ${report.checkedAt}`,
    `Overall decision: ${report.decision}`,
    `Release hold: ${report.releaseHold ? 'yes' : 'no'}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Total snapshots: ${report.summary.totalSnapshots}`,
    `- Restorable: ${report.summary.restorable}`,
    `- Needs review: ${report.summary.needsReview}`,
    `- Quarantined: ${report.summary.quarantined}`,
    `- Unrecoverable: ${report.summary.unrecoverable}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Snapshot Decisions',
    '',
    '| Snapshot | Repository | Version | Decision | Action | Restore minutes |',
    '| --- | --- | --- | --- | --- | ---: |',
    ...report.snapshots.map((snapshot) => `| ${snapshot.snapshotId} | ${snapshot.repositoryId} | ${snapshot.versionId} | ${snapshot.decision} | ${snapshot.action} | ${snapshot.restoreDurationMinutes || 0} |`),
    '',
    '## Reviewer Tasks',
    '',
    ...report.reviewerTasks.map((task) => `- ${task}`),
  ];

  fs.writeFileSync(path.join(reportDir, 'restore-rehearsal-review-packet.md'), `${lines.join('\n')}\n`);
}

function bar(value, max, width) {
  if (!max) {
    return 0;
  }
  return Math.round((value / max) * width);
}

function writeSvg() {
  const max = Math.max(
    report.summary.restorable,
    report.summary.needsReview,
    report.summary.quarantined,
    report.summary.unrecoverable,
    1
  );
  const rows = [
    ['Restorable', report.summary.restorable, '#2d8f5f'],
    ['Needs review', report.summary.needsReview, '#c07f25'],
    ['Quarantined', report.summary.quarantined, '#7e4f84'],
    ['Unrecoverable', report.summary.unrecoverable, '#b44343'],
  ];
  const rowSvg = rows.map((row, index) => {
    const y = 172 + index * 54;
    const width = bar(row[1], max, 420);
    return [
      `<text x="64" y="${y}" font-size="22" fill="#304044">${row[0]}</text>`,
      `<rect x="248" y="${y - 22}" width="420" height="24" rx="6" fill="#e8eee8"/>`,
      `<rect x="248" y="${y - 22}" width="${width}" height="24" rx="6" fill="${row[2]}"/>`,
      `<text x="696" y="${y}" font-size="22" fill="${row[2]}">${row[1]}</text>`,
    ].join('\n');
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Repository restore rehearsal report">
  <rect width="960" height="540" fill="#f6f8f4"/>
  <rect x="36" y="32" width="888" height="476" rx="10" fill="#fffffc" stroke="#cfd8d2"/>
  <text x="64" y="86" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#1f2a2e">Repository Restore Rehearsal Guard</text>
  <text x="64" y="124" font-family="Arial, sans-serif" font-size="20" fill="#5d6a6b">Checks hashes, LFS objects, backups, key escrow, citations, tags, and RTO.</text>
  <g font-family="Arial, sans-serif">
${rowSvg}
  </g>
  <rect x="64" y="414" width="306" height="52" rx="8" fill="${report.releaseHold ? '#f8dad8' : '#dbf1e5'}" stroke="#cfd8d2"/>
  <text x="82" y="447" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${report.releaseHold ? '#b44343' : '#2a8e5b'}">Release hold: ${report.releaseHold ? 'ON' : 'OFF'}</text>
  <text x="64" y="488" font-family="Arial, sans-serif" font-size="16" fill="#37669b">Digest ${report.auditDigest.slice(0, 40)}</text>
</svg>
`;

  fs.writeFileSync(path.join(reportDir, 'repository-restore-rehearsal.svg'), svg);
}

function run() {
  fs.mkdirSync(reportDir, { recursive: true });
  writeJson();
  writeMarkdown();
  writeSvg();
  console.log('Generated repository restore rehearsal demo artifacts:');
  console.log('- repository-restore-rehearsal-guard/reports/restore-rehearsal-report.json');
  console.log('- repository-restore-rehearsal-guard/reports/restore-rehearsal-review-packet.md');
  console.log('- repository-restore-rehearsal-guard/reports/repository-restore-rehearsal.svg');
}

run();
