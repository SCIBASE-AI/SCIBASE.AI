const fs = require('fs');
const path = require('path');

const { assessDashboardRelease } = require('./index');
const {
  blockedDashboard,
  cleanDashboard,
  warningDashboard,
  missingContrastDashboard,
  missingNoncriticalContrastDashboard,
  malformedComponentDashboard,
  malformedDashboardPacket,
  malformedMotionDashboard
} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const packets = [
  ['blocked-packet.json', assessDashboardRelease(blockedDashboard)],
  ['missing-contrast-packet.json', assessDashboardRelease(missingContrastDashboard)],
  ['missing-noncritical-contrast-packet.json', assessDashboardRelease(missingNoncriticalContrastDashboard)],
  ['malformed-component-packet.json', assessDashboardRelease(malformedComponentDashboard)],
  ['malformed-dashboard-packet.json', assessDashboardRelease(malformedDashboardPacket)],
  ['malformed-motion-packet.json', assessDashboardRelease(malformedMotionDashboard)],
  ['clean-packet.json', assessDashboardRelease(cleanDashboard)],
  ['warning-packet.json', assessDashboardRelease(warningDashboard)]
];

for (const [fileName, packet] of packets) {
  fs.writeFileSync(path.join(reportsDir, fileName), `${JSON.stringify(packet, null, 2)}\n`);
}

fs.writeFileSync(path.join(reportsDir, 'accessibility-report.md'), renderMarkdown(packets));
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), renderSvg(packets));

for (const [fileName, packet] of packets) {
  console.log(`${fileName}: ${packet.status}; findings=${packet.findings.length}; digest=${packet.auditDigest.slice(0, 12)}`);
}

function renderMarkdown(packetRows) {
  const lines = [
    '# Enterprise Dashboard Accessibility Report',
    '',
    '| Packet | Status | Dashboard | Export | Webhook | Findings |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const [fileName, packet] of packetRows) {
    lines.push([
      fileName,
      packet.status,
      packet.releaseLanes.adminDashboard,
      packet.releaseLanes.scheduledExport,
      packet.releaseLanes.webhookNotice,
      packet.findings.map((finding) => finding.code).join(', ') || 'none'
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('');
  lines.push('All packets use synthetic dashboard records and deterministic SHA-256 audit digests.');
  return `${lines.join('\n')}\n`;
}

function renderSvg(packetRows) {
  const height = 108 + packetRows.length * 72 + 36;
  const rows = packetRows.map(([, packet], index) => {
    const y = 105 + index * 72;
    const color = packet.status === 'hold_accessibility_release' ? '#dc2626' : packet.status === 'remediate_before_public_release' ? '#d97706' : '#16a34a';
    return `
      <g transform="translate(48 ${y})">
        <rect width="1104" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
        <circle cx="28" cy="25" r="11" fill="${color}"/>
        <text x="58" y="21" font-size="18" font-family="Arial" fill="#0f172a">${escapeXml(packet.dashboardId)}</text>
        <text x="58" y="39" font-size="13" font-family="Arial" fill="#475569">${escapeXml(packet.status)} | findings ${packet.findings.length} | digest ${packet.auditDigest.slice(0, 16)}</text>
      </g>`;
  }).join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">`,
    `  <rect width="1200" height="${height}" fill="#e2e8f0"/>`,
    '  <text x="48" y="52" font-size="31" font-family="Arial" font-weight="700" fill="#0f172a">Enterprise Dashboard Accessibility Guard</text>',
    '  <text x="48" y="80" font-size="16" font-family="Arial" fill="#334155">Institutional dashboards, exports, and webhook notices are gated before release.</text>',
    rows,
    '</svg>',
    ''
  ].join('\n');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
