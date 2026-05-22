const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const {
  evaluateSolverWithdrawalContinuity,
  buildCoordinatorPacket,
} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
const framesDir = path.join(reportsDir, 'frames');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateSolverWithdrawalContinuity(scenario),
}));

const decisionCounts = evaluations.reduce((counts, item) => {
  counts[item.decision] = (counts[item.decision] || 0) + 1;
  return counts;
}, {});
const findings = evaluations.reduce((sum, item) => sum + item.findings.length, 0);
const affectedTeams = evaluations.reduce((sum, item) => sum + item.summary.affectedTeams, 0);
const readyReplacements = evaluations.reduce((sum, item) => sum + item.summary.replacementsReady, 0);

const packetJson = JSON.stringify(evaluations, null, 2);
const coordinatorPacket = evaluations.map(buildCoordinatorPacket).join('\n---\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <text x="48" y="70" fill="#f8fafc" font-family="Arial, sans-serif" font-size="32" font-weight="700">Solver Withdrawal Continuity Guard</text>
  <text x="48" y="110" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="18">Challenge continuity packet for solver withdrawals, replacements, and artifact custody</text>
  <g transform="translate(48 156)">
    <rect width="260" height="148" rx="8" fill="#7f1d1d"/>
    <text x="24" y="46" fill="#fee2e2" font-family="Arial, sans-serif" font-size="20" font-weight="700">Workspace Hold</text>
    <text x="24" y="108" fill="#fef2f2" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['hold-workspace-continuity'] || 0}</text>
  </g>
  <g transform="translate(350 156)">
    <rect width="260" height="148" rx="8" fill="#92400e"/>
    <text x="24" y="46" fill="#fef3c7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Coordinator Review</text>
    <text x="24" y="108" fill="#fffbeb" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['coordinator-review'] || 0}</text>
  </g>
  <g transform="translate(652 156)">
    <rect width="260" height="148" rx="8" fill="#166534"/>
    <text x="24" y="46" fill="#dcfce7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Continuity Ready</text>
    <text x="24" y="108" fill="#f0fdf4" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['continuity-ready'] || 0}</text>
  </g>
  <text x="48" y="372" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="22">Affected teams: ${affectedTeams} | Ready replacements: ${readyReplacements} | Findings: ${findings}</text>
  <text x="48" y="416" fill="#d1d5db" font-family="Arial, sans-serif" font-size="18">Checks: notice, access revocation, IP return, team quorum, artifact custody, milestone risk, notifications</text>
  <text x="48" y="470" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">Synthetic data only. No credentials, private challenge files, payout actions, KYC, bank, or live workspace calls.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'withdrawal-continuity-packet.json'), `${packetJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'coordinator-packet.md'), coordinatorPacket);
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), svg);

function fillRect(buffer, width, x0, y0, rectWidth, rectHeight, color) {
  const [r, g, b] = color;
  const x1 = Math.min(width, x0 + rectWidth);
  const y1 = Math.min(Math.floor(buffer.length / (width * 3)), y0 + rectHeight);
  for (let y = Math.max(0, y0); y < y1; y += 1) {
    for (let x = Math.max(0, x0); x < x1; x += 1) {
      const offset = (y * width + x) * 3;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
    }
  }
}

function writePpmFrame(filePath, frameIndex, frameCount) {
  const width = 640;
  const height = 360;
  const buffer = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    buffer[i * 3] = 17;
    buffer[i * 3 + 1] = 24;
    buffer[i * 3 + 2] = 39;
  }
  const progress = frameIndex / Math.max(1, frameCount - 1);
  fillRect(buffer, width, 42, 42, 556, 44, [248, 250, 252]);
  fillRect(buffer, width, 42, 112, 160, 118, [127, 29, 29]);
  fillRect(buffer, width, 240, 112, 160, 118, [146, 64, 14]);
  fillRect(buffer, width, 438, 112, 160, 118, [22, 101, 52]);
  fillRect(buffer, width, 42, 266, Math.round(556 * progress), 28, [191, 219, 254]);
  fillRect(buffer, width, 42 + Math.round(492 * progress), 310, 64, 26, [248, 250, 252]);
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
  fs.writeFileSync(filePath, Buffer.concat([header, buffer]));
}

function createDemoVideo() {
  const ffmpegPath = process.env.FFMPEG_PATH;
  if (!ffmpegPath) {
    console.log('FFMPEG_PATH not set; skipped MP4 generation.');
    return;
  }

  fs.rmSync(framesDir, {recursive: true, force: true});
  fs.mkdirSync(framesDir, {recursive: true});
  const frameCount = 72;
  for (let index = 0; index < frameCount; index += 1) {
    writePpmFrame(path.join(framesDir, `frame-${String(index).padStart(3, '0')}.ppm`), index, frameCount);
  }

  const output = path.join(reportsDir, 'demo.mp4');
  const result = spawnSync(ffmpegPath, [
    '-y',
    '-framerate',
    '24',
    '-i',
    path.join(framesDir, 'frame-%03d.ppm'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    output,
  ], {encoding: 'utf8'});

  fs.rmSync(framesDir, {recursive: true, force: true});
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffmpeg failed to generate demo.mp4');
  }
}

createDemoVideo();

console.log(`Wrote ${evaluations.length} solver withdrawal evaluations to ${reportsDir}`);
console.log(`Decision counts: ${JSON.stringify(decisionCounts)}`);
console.log(`Affected teams: ${affectedTeams}`);
console.log(`Ready replacements: ${readyReplacements}`);
console.log(`Findings: ${findings}`);
