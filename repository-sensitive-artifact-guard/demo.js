'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sampleBundles = require('./sample-data');
const { evaluateRepository } = require('./index');

const reportDir = path.join(__dirname, 'reports');
const asOfDate = '2026-05-22';

fs.mkdirSync(reportDir, { recursive: true });

const portfolio = evaluateRepository(sampleBundles, { asOfDate });
const jsonPath = path.join(reportDir, 'sensitive-artifact-packet.json');
const markdownPath = path.join(reportDir, 'sensitive-artifact-report.md');
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
    '# Repository Sensitive Artifact Commit Guard Report',
    '',
    `As of: ${portfolio.asOfDate}`,
    `Repository digest: \`${portfolio.auditDigest}\``,
    '',
    '## Summary',
    '',
    `- Commit bundles reviewed: ${portfolio.bundleCount}`,
    `- Findings: ${portfolio.findingCount}`,
    `- Held commits: ${portfolio.heldCommits.join(', ') || 'none'}`,
    `- Actions: ${Object.entries(portfolio.byAction).map(([action, count]) => `${action}=${count}`).join(', ')}`,
    '',
    '## Bundle Decisions',
    '',
    '| Commit | Branch | Surface | Action | Severity | Findings | Held paths |',
    '| --- | --- | --- | --- | --- | ---: | --- |',
    ...portfolio.packets.map((packet) => `| ${packet.commitId} | ${packet.branch} | ${packet.targetSurface} | ${packet.action} | ${packet.severity} | ${packet.findingCount} | ${packet.heldPaths.join('<br>') || 'none'} |`),
    '',
    '## Guardrails',
    '',
    '- Uses synthetic commit, file, signal, and export metadata only.',
    '- Does not scan real repositories, real secrets, patient data, private projects, or external services.',
    '- Blocks release surfaces when synthetic secret, restricted-data, or patient-identifier indicators appear.',
    '- Emits deterministic rewrite, LFS routing, remediation, and rollback packets for reviewers.',
    ''
  ].join('\n');
}

function renderSvg(portfolio) {
  const actions = Object.entries(portfolio.byAction)
    .map(([action, count]) => `${escapeXml(action)} (${count})`)
    .join(' / ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Repository sensitive artifact guard summary</title>
  <desc id="desc">Synthetic commit bundle decisions for sensitive artifact gating.</desc>
  <rect width="1280" height="720" fill="#1f2933"/>
  <rect x="70" y="70" width="1140" height="580" rx="8" fill="#f8fafc"/>
  <text x="110" y="140" font-family="Arial, sans-serif" font-size="45" font-weight="700" fill="#111827">Repository sensitive artifact guard</text>
  <text x="110" y="194" font-family="Arial, sans-serif" font-size="25" fill="#334155">Commit, tag, and export checks before sensitive artifacts become durable</text>
  <rect x="110" y="246" width="310" height="148" rx="8" fill="#dbeafe"/>
  <text x="135" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1e3a8a">${portfolio.bundleCount} bundles</text>
  <text x="135" y="350" font-family="Arial, sans-serif" font-size="25" fill="#1e40af">commit/tag/export</text>
  <rect x="465" y="246" width="310" height="148" rx="8" fill="#fee2e2"/>
  <text x="490" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#7f1d1d">${portfolio.heldCommits.length} held</text>
  <text x="490" y="350" font-family="Arial, sans-serif" font-size="25" fill="#991b1b">rewrite or review</text>
  <rect x="820" y="246" width="310" height="148" rx="8" fill="#dcfce7"/>
  <text x="845" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#14532d">${portfolio.findingCount} findings</text>
  <text x="845" y="350" font-family="Arial, sans-serif" font-size="25" fill="#166534">deterministic packets</text>
  <text x="110" y="465" font-family="Arial, sans-serif" font-size="22" fill="#111827">Actions: ${actions}</text>
  <text x="110" y="590" font-family="Arial, sans-serif" font-size="20" fill="#475569">Digest: ${portfolio.auditDigest.slice(0, 32)}...</text>
</svg>
`;
}

function renderVideo(portfolio, outputPath) {
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const filters = [
    drawText(font, 'SCIBASE #10 Project Repository & Version Control', 64, 72, 37, 'white'),
    drawText(font, 'Repository sensitive artifact commit guard', 64, 136, 35, 'white'),
    drawText(font, `Reviewed ${portfolio.bundleCount} synthetic commit bundles`, 84, 238, 33, '0xdbeafe'),
    drawText(font, `${portfolio.heldCommits.length} commits held before merge tag or export`, 84, 304, 32, '0xfecaca'),
    drawText(font, `${portfolio.findingCount} findings with rollback and remediation packets`, 84, 370, 30, '0xdcfce7'),
    drawText(font, 'Checks synthetic credentials PHI markers restricted data notebook outputs and LFS gaps', 84, 462, 25, '0xe0f2fe'),
    drawText(font, 'No real repository scans patient data secrets credentials or external services', 84, 522, 25, '0xfef3c7'),
    drawText(font, `Audit digest ${portfolio.auditDigest.slice(0, 24)}`, 84, 596, 24, '0xcbd5e1')
  ].join(',');

  const result = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x1f2933:s=1280x720:d=4:r=25',
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
