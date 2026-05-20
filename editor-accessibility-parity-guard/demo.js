'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateEditorAccessibility } = require('./index');
const { document } = require('./sample-data');

const REPORTS_DIR = path.join(__dirname, 'reports');

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function writeJsonReport(report) {
  const outputPath = path.join(REPORTS_DIR, 'accessibility-parity-report.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function writeReviewPacket(report) {
  const blockRows = report.blocks.map((block) => `| ${block.id} | ${block.type} | ${block.decision} | ${block.section || 'n/a'} |`).join('\n');
  const blockerRows = report.blockers.map((finding) => `- ${finding.code}: ${finding.message}`).join('\n') || '- None';
  const warningRows = report.warnings.map((finding) => `- ${finding.code}: ${finding.message}`).join('\n') || '- None';
  const taskRows = report.reviewerTasks.map((task) => `- ${task}`).join('\n');
  const packet = [
    '# Editor Accessibility Parity Packet',
    '',
    `Document: ${report.title} (${report.documentId})`,
    `Decision: ${report.decision}`,
    `Release hold: ${report.releaseHold ? 'yes' : 'no'}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Block Decisions',
    '',
    '| Block | Type | Decision | Section |',
    '| --- | --- | --- | --- |',
    blockRows,
    '',
    '## Blockers',
    '',
    blockerRows,
    '',
    '## Warnings',
    '',
    warningRows,
    '',
    '## Reviewer Tasks',
    '',
    taskRows,
    '',
  ].join('\n');

  const outputPath = path.join(REPORTS_DIR, 'accessibility-review-packet.md');
  fs.writeFileSync(outputPath, packet);
  return outputPath;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function writeSvg(report) {
  const statusColor = report.decision === 'approved' ? '#0f7f4f' : report.decision === 'needs_review' ? '#a66500' : '#b42318';
  const rows = report.blocks.slice(0, 6).map((block, index) => {
    const y = 250 + index * 46;
    const color = block.decision === 'approved' ? '#0f7f4f' : block.decision === 'needs_review' ? '#a66500' : '#b42318';
    return `
      <g>
        <rect x="56" y="${y}" width="888" height="34" rx="6" fill="#ffffff" stroke="#d8dee8"/>
        <text x="76" y="${y + 23}" class="row-title">${escapeXml(block.id)}</text>
        <text x="352" y="${y + 23}" class="row">${escapeXml(block.type)}</text>
        <text x="564" y="${y + 23}" class="row">${escapeXml(block.section || 'n/a')}</text>
        <text x="744" y="${y + 23}" class="row status" fill="${color}">${escapeXml(block.decision)}</text>
      </g>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="570" viewBox="0 0 1000 570" role="img" aria-labelledby="title desc">
  <title id="title">Editor accessibility parity guard demo</title>
  <desc id="desc">Accessibility parity report summary for a collaborative scientific editor.</desc>
  <style>
    .title { font: 700 34px Arial, sans-serif; fill: #162033; }
    .label { font: 700 14px Arial, sans-serif; fill: #5e6b82; text-transform: uppercase; letter-spacing: .08em; }
    .value { font: 700 26px Arial, sans-serif; fill: #162033; }
    .row-title { font: 700 16px Arial, sans-serif; fill: #162033; }
    .row { font: 500 16px Arial, sans-serif; fill: #33415c; }
    .status { font-weight: 700; }
  </style>
  <rect width="1000" height="570" fill="#f4f7fb"/>
  <rect x="36" y="34" width="928" height="500" rx="8" fill="#eef3f8" stroke="#d8dee8"/>
  <text x="56" y="88" class="title">Editor Accessibility Parity Guard</text>
  <text x="56" y="126" class="row">${escapeXml(report.title)}</text>
  <g>
    <rect x="56" y="152" width="196" height="58" rx="6" fill="#ffffff" stroke="#d8dee8"/>
    <text x="72" y="176" class="label">Decision</text>
    <text x="72" y="201" class="value" fill="${statusColor}">${escapeXml(report.decision)}</text>
  </g>
  <g>
    <rect x="272" y="152" width="196" height="58" rx="6" fill="#ffffff" stroke="#d8dee8"/>
    <text x="288" y="176" class="label">Blockers</text>
    <text x="288" y="201" class="value">${report.summary.blockers}</text>
  </g>
  <g>
    <rect x="488" y="152" width="196" height="58" rx="6" fill="#ffffff" stroke="#d8dee8"/>
    <text x="504" y="176" class="label">Warnings</text>
    <text x="504" y="201" class="value">${report.summary.warnings}</text>
  </g>
  <g>
    <rect x="704" y="152" width="240" height="58" rx="6" fill="#ffffff" stroke="#d8dee8"/>
    <text x="720" y="176" class="label">Release Hold</text>
    <text x="720" y="201" class="value">${report.releaseHold ? 'yes' : 'no'}</text>
  </g>
  <text x="76" y="238" class="label">Block</text>
  <text x="352" y="238" class="label">Type</text>
  <text x="564" y="238" class="label">Section</text>
  <text x="744" y="238" class="label">Status</text>
  ${rows}
  <text x="56" y="512" class="row">Audit digest: ${escapeXml(report.auditDigest.slice(0, 32))}...</text>
</svg>`;

  const outputPath = path.join(REPORTS_DIR, 'accessibility-parity.svg');
  fs.writeFileSync(outputPath, svg.replace(/[ \t]+$/gm, String()));
  return outputPath;
}

function run() {
  ensureReportsDir();
  const report = evaluateEditorAccessibility({ document });
  const outputs = [
    writeJsonReport(report),
    writeReviewPacket(report),
    writeSvg(report),
  ];

  console.log('Generated editor accessibility parity demo artifacts:');
  outputs.forEach((output) => console.log(`- ${path.relative(process.cwd(), output)}`));
}

run();
