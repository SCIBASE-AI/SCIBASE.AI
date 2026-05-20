'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateChallenge } = require('./index');
const sampleData = require('./sample-data');

const REPORTS_DIR = path.join(__dirname, 'reports');

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function writeJsonReport(report) {
  const outputPath = path.join(REPORTS_DIR, 'leaderboard-integrity-report.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function writeReviewPacket(report) {
  const rows = report.submissions.map((submission) => `| ${submission.id} | ${submission.teamId} | ${submission.decision} | ${submission.reportedScore ?? 'n/a'} | ${submission.recomputedScore ?? 'n/a'} |`).join('\n');
  const blockerRows = report.blockers.map((finding) => `- ${finding.code}: ${finding.message}`).join('\n') || '- None';
  const warningRows = report.warnings.map((finding) => `- ${finding.code}: ${finding.message}`).join('\n') || '- None';
  const tasks = report.reviewerTasks.map((task) => `- ${task}`).join('\n');
  const packet = [
    '# Challenge Leaderboard Review Packet',
    '',
    `Challenge: ${report.title} (${report.challengeId})`,
    `Decision: ${report.decision}`,
    `Payout hold: ${report.payoutHold ? 'yes' : 'no'}`,
    `Audit digest: ${report.auditDigest}`,
    '',
    '## Submission Decisions',
    '',
    '| Submission | Team | Decision | Reported | Recomputed |',
    '| --- | --- | --- | ---: | ---: |',
    rows,
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
    tasks,
    '',
  ].join('\n');

  const outputPath = path.join(REPORTS_DIR, 'leaderboard-review-packet.md');
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
  const submissions = report.submissions.map((submission, index) => {
    const y = 235 + index * 58;
    const color = submission.decision === 'approved' ? '#0f7f4f' : submission.decision === 'needs_review' ? '#a66500' : '#b42318';
    return `
      <g>
        <rect x="56" y="${y}" width="888" height="44" rx="6" fill="#ffffff" stroke="#d8dee8"/>
        <text x="76" y="${y + 27}" class="row-title">${escapeXml(submission.teamId)}</text>
        <text x="342" y="${y + 27}" class="row">${escapeXml(submission.id)}</text>
        <text x="592" y="${y + 27}" class="row">${escapeXml(submission.reportedScore ?? 'n/a')}</text>
        <text x="744" y="${y + 27}" class="row status" fill="${color}">${escapeXml(submission.decision)}</text>
      </g>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="520" viewBox="0 0 1000 520" role="img" aria-labelledby="title desc">
  <title id="title">Challenge leaderboard integrity guard demo</title>
  <desc id="desc">Integrity report summary for a scientific challenge leaderboard.</desc>
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
  <text x="56" y="88" class="title">Leaderboard Integrity Guard</text>
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
    <text x="720" y="176" class="label">Payout Hold</text>
    <text x="720" y="201" class="value">${report.payoutHold ? 'yes' : 'no'}</text>
  </g>
  <text x="76" y="232" class="label">Team</text>
  <text x="342" y="232" class="label">Submission</text>
  <text x="592" y="232" class="label">Score</text>
  <text x="744" y="232" class="label">Status</text>
  ${submissions}
  <text x="56" y="462" class="row">Audit digest: ${escapeXml(report.auditDigest.slice(0, 32))}...</text>
</svg>`;

  const outputPath = path.join(REPORTS_DIR, 'leaderboard-integrity.svg');
  fs.writeFileSync(outputPath, svg.replace(/[ \t]+$/gm, String()));
  return outputPath;
}

function run() {
  ensureReportsDir();
  const report = evaluateChallenge(sampleData);
  const outputs = [
    writeJsonReport(report),
    writeReviewPacket(report),
    writeSvg(report),
  ];

  console.log('Generated challenge leaderboard integrity demo artifacts:');
  outputs.forEach((output) => console.log(`- ${path.relative(process.cwd(), output)}`));
}

run();
