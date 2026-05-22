'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sampleAlerts = require('./sample-data');
const { evaluateAlerts } = require('./index');

const reportDir = path.join(__dirname, 'reports');
const asOfDate = '2026-05-22';

fs.mkdirSync(reportDir, { recursive: true });

const portfolio = evaluateAlerts(sampleAlerts, { asOfDate });
const jsonPath = path.join(reportDir, 'admin-alert-escalation-packet.json');
const markdownPath = path.join(reportDir, 'admin-alert-escalation-report.md');
const svgPath = path.join(reportDir, 'summary.svg');
const mp4Path = path.join(reportDir, 'demo.mp4');

fs.writeFileSync(jsonPath, `${JSON.stringify(portfolio, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdown(portfolio));
fs.writeFileSync(svgPath, renderSvg(portfolio));
renderVideo(portfolio, mp4Path);

console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), mp4Path)}`);

function renderMarkdown(portfolio) {
  return [
    '# Enterprise Admin Alert Escalation Guard Report',
    '',
    `As of: ${portfolio.asOfDate}`,
    `Alert digest: \`${portfolio.auditDigest}\``,
    '',
    '## Summary',
    '',
    `- Alerts reviewed: ${portfolio.alertCount}`,
    `- Findings: ${portfolio.findingCount}`,
    `- Escalated alerts: ${portfolio.escalatedAlerts.join(', ') || 'none'}`,
    `- Actions: ${Object.entries(portfolio.byAction).map(([action, count]) => `${action}=${count}`).join(', ')}`,
    '',
    '## Alert Decisions',
    '',
    '| Alert | Category | Severity | Action | Findings | Dashboard badges |',
    '| --- | --- | --- | --- | ---: | --- |',
    ...portfolio.packets.map((packet) => `| ${packet.alertId} | ${packet.category} | ${packet.severity} | ${packet.action} | ${packet.findingCount} | ${packet.dashboardBadges.join(', ') || 'none'} |`),
    '',
    '## Guardrails',
    '',
    '- Uses synthetic enterprise alert, owner, routing, digest, and webhook metadata only.',
    '- Does not deliver live email, SMS, Slack, webhook, or external provider notifications.',
    '- Keeps critical compliance/security alerts visible even when muted, digested, quiet-hours, duplicated, or routed to unavailable owners.',
    '- Emits deterministic dashboard badges, webhook-ready event summaries, and audit digests.',
    ''
  ].join('\n');
}

function renderSvg(portfolio) {
  const actions = Object.entries(portfolio.byAction)
    .map(([action, count]) => `${escapeXml(action)} (${count})`)
    .join(' / ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Enterprise admin alert escalation guard summary</title>
  <desc id="desc">Synthetic enterprise alert delivery and escalation decisions.</desc>
  <rect width="1280" height="720" fill="#233142"/>
  <rect x="70" y="70" width="1140" height="580" rx="8" fill="#f8fafc"/>
  <text x="110" y="140" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#111827">Enterprise admin alert escalation guard</text>
  <text x="110" y="194" font-family="Arial, sans-serif" font-size="25" fill="#334155">Mute, digest, owner, webhook, and quiet-hours routing checks</text>
  <rect x="110" y="246" width="310" height="148" rx="8" fill="#dbeafe"/>
  <text x="135" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1e3a8a">${portfolio.alertCount} alerts</text>
  <text x="135" y="350" font-family="Arial, sans-serif" font-size="25" fill="#1e40af">admin routing</text>
  <rect x="465" y="246" width="310" height="148" rx="8" fill="#fee2e2"/>
  <text x="490" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#7f1d1d">${portfolio.escalatedAlerts.length} escalated</text>
  <text x="490" y="350" font-family="Arial, sans-serif" font-size="25" fill="#991b1b">mute bypass</text>
  <rect x="820" y="246" width="310" height="148" rx="8" fill="#dcfce7"/>
  <text x="845" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#14532d">${portfolio.findingCount} findings</text>
  <text x="845" y="350" font-family="Arial, sans-serif" font-size="25" fill="#166534">review packets</text>
  <text x="110" y="465" font-family="Arial, sans-serif" font-size="22" fill="#111827">Actions: ${actions}</text>
  <text x="110" y="590" font-family="Arial, sans-serif" font-size="20" fill="#475569">Digest: ${portfolio.auditDigest.slice(0, 32)}...</text>
</svg>
`;
}

function renderVideo(portfolio, outputPath) {
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const filters = [
    drawText(font, 'SCIBASE #19 Enterprise Tooling', 64, 72, 40, 'white'),
    drawText(font, 'Admin notification escalation guard', 64, 136, 36, 'white'),
    drawText(font, `Reviewed ${portfolio.alertCount} synthetic admin alerts`, 84, 238, 33, '0xdbeafe'),
    drawText(font, `${portfolio.escalatedAlerts.length} alerts escalated before mute or digest`, 84, 304, 32, '0xfecaca'),
    drawText(font, `${portfolio.findingCount} findings with dashboard badges and webhook summaries`, 84, 370, 28, '0xdcfce7'),
    drawText(font, 'Checks quiet hours owner fallback webhook health duplicates and digest delays', 84, 462, 25, '0xe0f2fe'),
    drawText(font, 'No live notification delivery email SMS Slack webhooks or external providers', 84, 522, 25, '0xfef3c7'),
    drawText(font, `Audit digest ${portfolio.auditDigest.slice(0, 24)}`, 84, 596, 24, '0xcbd5e1')
  ].join(',');

  const result = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x233142:s=1280x720:d=4:r=25',
    '-vf', filters,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    outputPath
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`ffmpeg failed to render demo.mp4:\n${message}`);
  }
}

function drawText(font, text, x, y, size, color) {
  return `drawtext=fontfile='${font}':text='${escapeDrawText(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}

function escapeDrawText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,')
    .replace(/&/g, '\\&');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
