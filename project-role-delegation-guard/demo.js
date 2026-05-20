const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildDelegationReviewPacket } = require('./index');
const { sampleWorkspace } = require('./sample-data');

const outputDir = path.join(__dirname, 'demo-output');
fs.mkdirSync(outputDir, { recursive: true });

const packet = buildDelegationReviewPacket(sampleWorkspace, {
  asOf: '2026-05-20T12:00:00Z',
});

fs.writeFileSync(path.join(outputDir, 'delegation-review-packet.json'), `${JSON.stringify(packet, null, 2)}\n`);

const rows = packet.holds
  .map((hold, index) => `<text x="120" y="${320 + index * 48}" font-family="Arial" font-size="23" fill="#263238">${index + 1}. ${hold.requestId}: ${hold.code}</text>`)
  .join('\n  ');

fs.writeFileSync(path.join(outputDir, 'demo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="#0b1320"/>
  <rect x="70" y="70" width="1140" height="580" rx="18" fill="#ffffff"/>
  <text x="110" y="145" font-family="Arial" font-size="45" font-weight="700" fill="#102a43">Project Role Delegation Guard</text>
  <text x="110" y="205" font-family="Arial" font-size="25" fill="#486581">${packet.workspaceId}</text>
  <text x="110" y="275" font-family="Arial" font-size="34" font-weight="700" fill="#b42318">${packet.holds.length} sensitive delegation holds</text>
  ${rows}
  <text x="110" y="620" font-family="Arial" font-size="22" fill="#627d98">audit digest: ${packet.auditDigest.slice(0, 24)}...</text>
</svg>
`);

fs.writeFileSync(path.join(outputDir, 'approval-checklist.md'), [
  '# Delegation approval checklist',
  '',
  `Workspace: ${packet.workspaceId}`,
  `Status: ${packet.overallStatus}`,
  '',
  ...packet.approvalChecklist.map((item) => `- ${item.requestId}: ${item.requiredAction}`),
  '',
  `Audit digest: ${packet.auditDigest}`,
  '',
].join('\n'));

function renderMp4() {
  const videoPath = path.join(outputDir, 'demo.mp4');
  const font = 'C\\:/Windows/Fonts/arial.ttf';
  const escapeText = (value) => String(value).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const filters = [
    `drawtext=fontfile='${font}':text='${escapeText('Project Role Delegation Guard')}':x=70:y=80:fontsize=44:fontcolor=white`,
    `drawtext=fontfile='${font}':text='${escapeText(`${packet.holds.length} approval blockers found`)}':x=70:y=155:fontsize=34:fontcolor=0xffd166`,
    ...packet.holds.map((hold, index) =>
      `drawtext=fontfile='${font}':text='${escapeText(`${hold.requestId}: ${hold.code}`)}':x=90:y=${235 + index * 58}:fontsize=28:fontcolor=white`,
    ),
    `drawtext=fontfile='${font}':text='${escapeText(`audit ${packet.auditDigest.slice(0, 20)}...`)}':x=70:y=630:fontsize=24:fontcolor=0x93c5fd`,
  ].join(',');

  execFileSync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x0b1320:s=1280x720:d=7',
    '-vf',
    filters,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    videoPath,
  ], { stdio: 'inherit' });
}

renderMp4();

console.log(`Wrote demo artifacts to ${outputDir}`);
