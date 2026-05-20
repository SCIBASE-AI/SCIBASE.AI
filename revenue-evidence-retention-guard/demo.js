'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateRevenueEvidenceRetentionGuard } = require('./index');
const sample = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
const report = evaluateRevenueEvidenceRetentionGuard(sample.register);

function dollars(cents) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function writeJson() {
  fs.writeFileSync(path.join(reportDir, 'revenue-evidence-retention-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown() {
  const lines = [
    '# Revenue Evidence Retention Review Packet',
    '',
    `Checked at: ${report.checkedAt}`,
    `Overall decision: ${report.decision}`,
    `Revenue at risk: ${dollars(report.summary.revenueAtRiskCents)}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Total packets: ${report.summary.totalPackets}`,
    `- Release revenue: ${report.summary.releaseRevenue}`,
    `- Release with controls: ${report.summary.releaseWithControls}`,
    `- Hold revenue: ${report.summary.holdRevenue}`,
    `- Quarantine revenue: ${report.summary.quarantineRevenue}`,
    '',
    '## Invoice Decisions',
    '',
    '| Invoice | Stream | Amount | Evidence | Retained until | Decision |',
    '| --- | --- | ---: | ---: | --- | --- |',
    ...report.packets.map((packet) => `| ${packet.invoiceId} | ${packet.stream} | ${dollars(packet.amountCents)} | ${packet.evidenceCount} | ${packet.retainedUntil} | ${packet.decision} |`),
    '',
    '## Finance Tasks',
    '',
    ...report.financeTasks.map((task) => `- ${task}`),
  ];

  fs.writeFileSync(path.join(reportDir, 'revenue-evidence-retention-packet.md'), `${lines.join('\n')}\n`);
}

function writeSvg() {
  const rows = [
    ['Release', report.summary.releaseRevenue, '#2c8f64'],
    ['Controls', report.summary.releaseWithControls, '#bb7d25'],
    ['Hold', report.summary.holdRevenue, '#7856a6'],
    ['Quarantine', report.summary.quarantineRevenue, '#b74743'],
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Revenue evidence retention guard report">
  <rect width="960" height="540" fill="#f5f7f6"/>
  <rect x="36" y="32" width="888" height="476" rx="10" fill="#fffffc" stroke="#cfd8d2"/>
  <text x="64" y="86" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#1f2a2e">Revenue Evidence Retention Guard</text>
  <text x="64" y="124" font-family="Arial, sans-serif" font-size="20" fill="#5d6a6b">Subscription, AI compute, and analytics licensing invoice evidence review.</text>
  <g font-family="Arial, sans-serif">
${rowSvg}
  </g>
  <rect x="64" y="420" width="438" height="52" rx="8" fill="#f8dad8" stroke="#cfd8d2"/>
  <text x="82" y="453" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#b74743">Revenue at risk: ${dollars(report.summary.revenueAtRiskCents)}</text>
  <text x="64" y="494" font-family="Arial, sans-serif" font-size="16" fill="#37669b">Digest ${report.auditDigest.slice(0, 40)}</text>
</svg>
`;

  fs.writeFileSync(path.join(reportDir, 'revenue-evidence-retention.svg'), svg);
}

function run() {
  fs.mkdirSync(reportDir, { recursive: true });
  writeJson();
  writeMarkdown();
  writeSvg();
  console.log('Generated revenue evidence retention demo artifacts:');
  console.log('- revenue-evidence-retention-guard/reports/revenue-evidence-retention-report.json');
  console.log('- revenue-evidence-retention-guard/reports/revenue-evidence-retention-packet.md');
  console.log('- revenue-evidence-retention-guard/reports/revenue-evidence-retention.svg');
}

run();
