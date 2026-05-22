'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sampleGraph = require('./sample-data');
const { evaluateGraph } = require('./index');

const reportDir = path.join(__dirname, 'reports');
const asOfDate = '2026-05-22';

fs.mkdirSync(reportDir, { recursive: true });

const graph = evaluateGraph(sampleGraph, { asOfDate });
const jsonPath = path.join(reportDir, 'clinical-trial-registry-packet.json');
const markdownPath = path.join(reportDir, 'clinical-trial-registry-report.md');
const svgPath = path.join(reportDir, 'summary.svg');
const mp4Path = path.join(reportDir, 'demo.mp4');

fs.writeFileSync(jsonPath, `${JSON.stringify(graph, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdown(graph));
fs.writeFileSync(svgPath, renderSvg(graph));
renderVideo(graph, mp4Path);

console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), mp4Path)}`);

function renderMarkdown(graph) {
  return [
    '# Clinical Trial Registry Graph Guard Report',
    '',
    `As of: ${graph.asOfDate}`,
    `Graph digest: \`${graph.auditDigest}\``,
    '',
    '## Summary',
    '',
    `- Trials reviewed: ${graph.trialCount}`,
    `- Held or suppressed trials: ${graph.heldTrialCount}`,
    `- Curator actions: ${graph.curatorActionCount}`,
    `- Actions: ${Object.entries(graph.byAction).map(([action, count]) => `${action}=${count}`).join(', ')}`,
    '',
    '## Trial Decisions',
    '',
    '| Trial | Registry | Status | Phase | Action | Severity | Issues |',
    '| --- | --- | --- | --- | --- | --- | ---: |',
    ...graph.packets.map((packet) => `| ${packet.trialId} | ${packet.registryId} | ${packet.status} | ${packet.phase} | ${packet.action} | ${packet.severity} | ${packet.issueCount} |`),
    '',
    '## Guardrails',
    '',
    '- Uses synthetic trial, publication, dataset, protocol, and recommendation graph metadata only.',
    '- Does not call ClinicalTrials.gov, EUCTR, ISRCTN, journal APIs, repositories, or external services.',
    '- Suppresses recommendation edges when registry IDs, trial status, results posting, or linked evidence are unsafe.',
    '- Emits deterministic audit digests and curator actions for reviewer packets.',
    ''
  ].join('\n');
}

function renderSvg(graph) {
  const actions = Object.entries(graph.byAction)
    .map(([action, count]) => `${escapeXml(action)} (${count})`)
    .join(' / ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Clinical trial registry graph guard summary</title>
  <desc id="desc">Synthetic clinical trial registry decisions for SCIBASE knowledge graph recommendations.</desc>
  <rect width="1280" height="720" fill="#102a43"/>
  <rect x="70" y="70" width="1140" height="580" rx="8" fill="#f8fafc"/>
  <text x="110" y="140" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="#111827">Clinical trial registry graph guard</text>
  <text x="110" y="194" font-family="Arial, sans-serif" font-size="25" fill="#334155">Trial registry integrity before knowledge graph recommendations are shown</text>
  <rect x="110" y="246" width="310" height="148" rx="8" fill="#dbeafe"/>
  <text x="135" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1e3a8a">${graph.trialCount} trials</text>
  <text x="135" y="350" font-family="Arial, sans-serif" font-size="25" fill="#1e40af">NCT / EUCTR / ISRCTN</text>
  <rect x="465" y="246" width="310" height="148" rx="8" fill="#fee2e2"/>
  <text x="490" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#7f1d1d">${graph.heldTrialCount} held</text>
  <text x="490" y="350" font-family="Arial, sans-serif" font-size="25" fill="#991b1b">recommendations suppressed</text>
  <rect x="820" y="246" width="310" height="148" rx="8" fill="#dcfce7"/>
  <text x="845" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#14532d">${graph.curatorActionCount} actions</text>
  <text x="845" y="350" font-family="Arial, sans-serif" font-size="25" fill="#166534">review packets</text>
  <text x="110" y="465" font-family="Arial, sans-serif" font-size="23" fill="#111827">Actions: ${actions}</text>
  <text x="110" y="590" font-family="Arial, sans-serif" font-size="20" fill="#475569">Digest: ${graph.auditDigest.slice(0, 32)}...</text>
</svg>
`;
}

function renderVideo(graph, outputPath) {
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const filters = [
    drawText(font, 'SCIBASE #17 Knowledge Graph Integration', 64, 72, 40, 'white'),
    drawText(font, 'Clinical trial registry graph guard', 64, 136, 36, 'white'),
    drawText(font, `Reviewed ${graph.trialCount} synthetic registry-backed trial nodes`, 84, 238, 33, '0xdbeafe'),
    drawText(font, `${graph.heldTrialCount} trials held or suppressed before recommendation display`, 84, 304, 32, '0xfecaca'),
    drawText(font, `${graph.curatorActionCount} curator actions generated`, 84, 370, 32, '0xdcfce7'),
    drawText(font, 'Checks NCT/EUCTR/ISRCTN IDs, status, phase, endpoints, results posting', 84, 462, 26, '0xe0f2fe'),
    drawText(font, 'No live registry APIs, patient data, journal lookups, or external services', 84, 522, 26, '0xfef3c7'),
    drawText(font, `Audit digest ${graph.auditDigest.slice(0, 24)}`, 84, 596, 24, '0xcbd5e1')
  ].join(',');

  const result = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x102a43:s=1280x720:d=4:r=25',
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
