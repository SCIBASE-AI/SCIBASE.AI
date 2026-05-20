'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateLiteratureSurveillance } = require('./index');
const sample = require('./sample-data');

const REPORTS_DIR = path.join(__dirname, 'reports');

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function writeJsonReport(report) {
  const outputPath = path.join(REPORTS_DIR, 'literature-surveillance-report.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function writeReviewPacket(report) {
  const claimRows = report.claims.map((claim) => `| ${claim.id} | ${claim.decision} | ${claim.relatedEventIds.join(', ') || 'none'} |`).join('\n');
  const queueRows = report.updateQueue.map((item) => `| ${item.eventId} | ${item.priority} | ${item.action} | ${item.relatedClaimIds.join(', ') || 'none'} |`).join('\n');
  const blockerRows = report.blockers.map((finding) => `- ${finding.code}: ${finding.message}`).join('\n') || '- None';
  const warningRows = report.warnings.map((finding) => `- ${finding.code}: ${finding.message}`).join('\n') || '- None';
  const taskRows = report.reviewerTasks.map((task) => `- ${task}`).join('\n');
  const packet = [
    '# Living Literature Surveillance Packet',
    '',
    `Manuscript: ${report.title} (${report.manuscriptId})`,
    `Decision: ${report.decision}`,
    `Report hold: ${report.reportHold ? 'yes' : 'no'}`,
    `Checked at: ${report.checkedAt}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Claim Decisions',
    '',
    '| Claim | Decision | Related Events |',
    '| --- | --- | --- |',
    claimRows,
    '',
    '## Update Queue',
    '',
    '| Event | Priority | Action | Claims |',
    '| --- | --- | --- | --- |',
    queueRows || '| none | n/a | no action | none |',
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

  const outputPath = path.join(REPORTS_DIR, 'literature-review-packet.md');
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
  const rows = report.claims.map((claim, index) => {
    const y = 250 + index * 58;
    const color = claim.decision === 'approved' ? '#0f7f4f' : claim.decision === 'needs_review' ? '#a66500' : '#b42318';
    return `
      <g>
        <rect x="56" y="${y}" width="888" height="44" rx="6" fill="#ffffff" stroke="#d8dee8"/>
        <text x="76" y="${y + 27}" class="row-title">${escapeXml(claim.id)}</text>
        <text x="434" y="${y + 27}" class="row">${escapeXml(claim.relatedEventIds.join(', ') || 'none')}</text>
        <text x="744" y="${y + 27}" class="row status" fill="${color}">${escapeXml(claim.decision)}</text>
      </g>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="520" viewBox="0 0 1000 520" role="img" aria-labelledby="title desc">
  <title id="title">Living literature surveillance assistant demo</title>
  <desc id="desc">Living literature surveillance report for an AI research assistant.</desc>
  <style>
    .title { font: 700 34px Arial, sans-serif; fill: #162033; }
    .label { font: 700 14px Arial, sans-serif; fill: #5e6b82; text-transform: uppercase; letter-spacing: .08em; }
    .value { font: 700 26px Arial, sans-serif; fill: #162033; }
    .row-title { font: 700 17px Arial, sans-serif; fill: #162033; }
    .row { font: 500 16px Arial, sans-serif; fill: #33415c; }
    .status { font-weight: 700; }
  </style>
  <rect width="1000" height="520" fill="#f4f7fb"/>
  <rect x="36" y="34" width="928" height="452" rx="8" fill="#eef3f8" stroke="#d8dee8"/>
  <text x="56" y="88" class="title">Living Literature Surveillance</text>
  <text x="56" y="126" class="row">${escapeXml(report.title)}</text>
  <g>
    <rect x="56" y="152" width="196" height="58" rx="6" fill="#ffffff" stroke="#d8dee8"/>
    <text x="72" y="176" class="label">Decision</text>
    <text x="72" y="201" class="value" fill="${statusColor}">${escapeXml(report.decision)}</text>
  </g>
  <g>
    <rect x="272" y="152" width="196" height="58" rx="6" fill="#ffffff" stroke="#d8dee8"/>
    <text x="288" y="176" class="label">Updates</text>
    <text x="288" y="201" class="value">${report.summary.updateQueue}</text>
  </g>
  <g>
    <rect x="488" y="152" width="196" height="58" rx="6" fill="#ffffff" stroke="#d8dee8"/>
    <text x="504" y="176" class="label">Gaps</text>
    <text x="504" y="201" class="value">${report.summary.gapSignals}</text>
  </g>
  <g>
    <rect x="704" y="152" width="240" height="58" rx="6" fill="#ffffff" stroke="#d8dee8"/>
    <text x="720" y="176" class="label">Report Hold</text>
    <text x="720" y="201" class="value">${report.reportHold ? 'yes' : 'no'}</text>
  </g>
  <text x="76" y="238" class="label">Claim</text>
  <text x="434" y="238" class="label">Related Events</text>
  <text x="744" y="238" class="label">Status</text>
  ${rows}
  <text x="56" y="462" class="row">Audit digest: ${escapeXml(report.auditDigest.slice(0, 32))}...</text>
</svg>`;

  const outputPath = path.join(REPORTS_DIR, 'literature-surveillance.svg');
  fs.writeFileSync(outputPath, svg.replace(/[ \t]+$/gm, String()));
  return outputPath;
}

function run() {
  ensureReportsDir();
  const report = evaluateLiteratureSurveillance({
    manuscript: sample.manuscript,
    literatureEvents: sample.literatureEvents,
    checkedAt: sample.checkedAt,
  });
  const outputs = [
    writeJsonReport(report),
    writeReviewPacket(report),
    writeSvg(report),
  ];

  console.log('Generated living literature surveillance demo artifacts:');
  outputs.forEach((output) => console.log(`- ${path.relative(process.cwd(), output)}`));
}

run();
