const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildTombstoneLedgerPacket } = require('./index');
const { sampleHostingProject } = require('./sample-data');

const outputDir = path.join(__dirname, 'demo-output');
fs.mkdirSync(outputDir, { recursive: true });

const packet = buildTombstoneLedgerPacket(sampleHostingProject, {
  asOf: '2026-05-20T12:00:00Z',
});

fs.writeFileSync(path.join(outputDir, 'tombstone-ledger-packet.json'), `${JSON.stringify(packet, null, 2)}\n`);

const rows = packet.holds
  .map((hold, index) => `<text x="120" y="${310 + index * 46}" font-family="Arial" font-size="22" fill="#243b53">${index + 1}. ${hold.artifactId}: ${hold.code}</text>`)
  .join('\n  ');

fs.writeFileSync(path.join(outputDir, 'demo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="#172554"/>
  <rect x="70" y="70" width="1140" height="580" rx="18" fill="#f8fafc"/>
  <text x="110" y="145" font-family="Arial" font-size="45" font-weight="700" fill="#0f172a">Artifact Retention Tombstone Ledger</text>
  <text x="110" y="205" font-family="Arial" font-size="25" fill="#334155">${packet.projectId}</text>
  <text x="110" y="270" font-family="Arial" font-size="32" font-weight="700" fill="#b91c1c">${packet.holds.length} disposal blockers</text>
  ${rows}
  <text x="110" y="620" font-family="Arial" font-size="22" fill="#475569">audit digest: ${packet.auditDigest.slice(0, 24)}...</text>
</svg>
`);

fs.writeFileSync(path.join(outputDir, 'disposal-review.md'), [
  '# Artifact retention and tombstone review',
  '',
  `Project: ${packet.projectId}`,
  `Status: ${packet.overallStatus}`,
  '',
  '## Holds',
  ...packet.holds.map((hold) => `- ${hold.artifactId}: ${hold.requiredAction}`),
  '',
  `Audit digest: ${packet.auditDigest}`,
  '',
].join('\n'));

function renderMp4() {
  const videoPath = path.join(outputDir, 'demo.mp4');
  const font = 'C\\:/Windows/Fonts/arial.ttf';
  const escapeText = (value) => String(value).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const filters = [
    `drawtext=fontfile='${font}':text='${escapeText('Artifact Retention Tombstone Ledger')}':x=70:y=80:fontsize=41:fontcolor=white`,
    `drawtext=fontfile='${font}':text='${escapeText(`${packet.holds.length} disposal blockers before deletion`)}':x=70:y=155:fontsize=32:fontcolor=0xffd166`,
    ...packet.holds.map((hold, index) =>
      `drawtext=fontfile='${font}':text='${escapeText(`${hold.artifactId}: ${hold.code}`)}':x=90:y=${230 + index * 55}:fontsize=26:fontcolor=white`,
    ),
    `drawtext=fontfile='${font}':text='${escapeText(`audit ${packet.auditDigest.slice(0, 20)}...`)}':x=70:y=630:fontsize=24:fontcolor=0x93c5fd`,
  ].join(',');

  execFileSync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x172554:s=1280x720:d=7',
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
