const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildReleaseHoldPacket } = require('./index');
const { sampleRepository } = require('./sample-data');

const outputDir = path.join(__dirname, 'demo-output');
fs.mkdirSync(outputDir, { recursive: true });

const packet = buildReleaseHoldPacket(sampleRepository, {
  asOf: '2026-05-20T12:00:00Z',
  releaseTag: 'v2.1.0',
});

fs.writeFileSync(path.join(outputDir, 'release-hold-packet.json'), `${JSON.stringify(packet, null, 2)}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="70" y="70" width="1140" height="580" rx="18" fill="#f8fafc"/>
  <text x="110" y="145" font-family="Arial" font-size="46" font-weight="700" fill="#0f172a">Repository Access Review Gate</text>
  <text x="110" y="205" font-family="Arial" font-size="25" fill="#334155">${packet.repositoryId} / ${packet.releaseTag}</text>
  <text x="110" y="285" font-family="Arial" font-size="34" font-weight="700" fill="#b91c1c">${packet.releaseHolds.length} release holds before export</text>
  ${packet.releaseHolds
    .map(
      (hold, index) =>
        `<text x="130" y="${350 + index * 45}" font-family="Arial" font-size="24" fill="#1f2937">${index + 1}. ${hold.code} -> ${hold.owner}</text>`,
    )
    .join('\n  ')}
  <text x="110" y="620" font-family="Arial" font-size="22" fill="#475569">audit digest: ${packet.auditDigest.slice(0, 24)}...</text>
</svg>
`;
fs.writeFileSync(path.join(outputDir, 'demo.svg'), svg);

const markdown = [
  '# Repository access review gate demo',
  '',
  `Repository: ${packet.repositoryId}`,
  `Release: ${packet.releaseTag}`,
  `Status: ${packet.releaseStatus}`,
  `Blocking holds: ${packet.releaseHolds.length}`,
  '',
  '## Required reviewer actions',
  ...packet.reviewerChecklist.map((item) => `- ${item.owner}: ${item.requiredAction}`),
  '',
  `Audit digest: ${packet.auditDigest}`,
  '',
].join('\n');
fs.writeFileSync(path.join(outputDir, 'reviewer-packet.md'), markdown);

function renderMp4() {
  const videoPath = path.join(outputDir, 'demo.mp4');
  const font = 'C\\:/Windows/Fonts/arial.ttf';
  const text = (value) => String(value).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const filters = [
    `drawtext=fontfile='${font}':text='${text('Repository Access Review Gate')}':x=70:y=80:fontsize=44:fontcolor=white`,
    `drawtext=fontfile='${font}':text='${text(`${packet.releaseHolds.length} blocking release holds detected`)}':x=70:y=160:fontsize=34:fontcolor=0xffd166`,
    ...packet.releaseHolds.slice(0, 5).map((hold, index) =>
      `drawtext=fontfile='${font}':text='${text(`${index + 1}. ${hold.code} -> ${hold.owner}`)}':x=90:y=${240 + index * 54}:fontsize=27:fontcolor=white`,
    ),
    `drawtext=fontfile='${font}':text='${text(`audit ${packet.auditDigest.slice(0, 20)}...`)}':x=70:y=630:fontsize=24:fontcolor=0x93c5fd`,
  ].join(',');

  execFileSync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x111827:s=1280x720:d=7',
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
