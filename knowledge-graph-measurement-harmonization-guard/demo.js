const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildGraphHarmonizationPacket } = require('./index');
const { sampleGraph } = require('./sample-data');

const outputDir = path.join(__dirname, 'demo-output');
fs.mkdirSync(outputDir, { recursive: true });

const packet = buildGraphHarmonizationPacket(sampleGraph);

fs.writeFileSync(path.join(outputDir, 'harmonization-packet.json'), `${JSON.stringify(packet, null, 2)}\n`);

const rows = packet.findings
  .map((finding, index) => `<text x="120" y="${315 + index * 48}" font-family="Arial" font-size="23" fill="#1f2937">${index + 1}. ${finding.edgeId}: ${finding.code}</text>`)
  .join('\n  ');

fs.writeFileSync(path.join(outputDir, 'demo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="#0f172a"/>
  <rect x="70" y="70" width="1140" height="580" rx="18" fill="#f8fafc"/>
  <text x="110" y="145" font-family="Arial" font-size="43" font-weight="700" fill="#111827">Knowledge Graph Measurement Harmonization</text>
  <text x="110" y="205" font-family="Arial" font-size="25" fill="#475569">${packet.graphId}</text>
  <text x="110" y="275" font-family="Arial" font-size="33" font-weight="700" fill="#b91c1c">${packet.findings.length} comparable-edge blockers</text>
  ${rows}
  <text x="110" y="620" font-family="Arial" font-size="22" fill="#475569">audit digest: ${packet.auditDigest.slice(0, 24)}...</text>
</svg>
`);

fs.writeFileSync(path.join(outputDir, 'curator-actions.md'), [
  '# Measurement harmonization curator actions',
  '',
  `Graph: ${packet.graphId}`,
  `Status: ${packet.overallStatus}`,
  '',
  ...packet.curatorActions.map((item) => `- ${item.edgeId}: ${item.action}`),
  '',
  `Audit digest: ${packet.auditDigest}`,
  '',
].join('\n'));

function renderMp4() {
  const videoPath = path.join(outputDir, 'demo.mp4');
  const font = 'C\\:/Windows/Fonts/arial.ttf';
  const escapeText = (value) => String(value).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const filters = [
    `drawtext=fontfile='${font}':text='${escapeText('KG Measurement Harmonization Guard')}':x=70:y=80:fontsize=42:fontcolor=white`,
    `drawtext=fontfile='${font}':text='${escapeText(`${packet.findings.length} graph edge blockers found`)}':x=70:y=155:fontsize=32:fontcolor=0xffd166`,
    ...packet.findings.map((finding, index) =>
      `drawtext=fontfile='${font}':text='${escapeText(`${finding.edgeId}: ${finding.code}`)}':x=90:y=${235 + index * 58}:fontsize=25:fontcolor=white`,
    ),
    `drawtext=fontfile='${font}':text='${escapeText(`audit ${packet.auditDigest.slice(0, 20)}...`)}':x=70:y=630:fontsize=24:fontcolor=0x93c5fd`,
  ].join(',');

  execFileSync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x0f172a:s=1280x720:d=7',
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
