const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const {
  evaluateBiomethodsProvenance,
  buildReviewerReport,
} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
const framesDir = path.join(reportsDir, 'frames');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateBiomethodsProvenance(scenario),
}));

const packetJson = JSON.stringify(evaluations, null, 2);
const reviewerReport = evaluations.map(buildReviewerReport).join('\n---\n');
const decisionCounts = evaluations.reduce((counts, item) => {
  counts[item.decision] = (counts[item.decision] || 0) + 1;
  return counts;
}, {});
const findings = evaluations.reduce((sum, item) => sum + item.findings.length, 0);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#101820"/>
  <text x="48" y="72" fill="#f8fafc" font-family="Arial, sans-serif" font-size="32" font-weight="700">Biomethods Provenance Assistant</text>
  <text x="48" y="112" fill="#b9e6ff" font-family="Arial, sans-serif" font-size="18">Synthetic AI peer-review aid for specimen, cell-line, and reagent traceability</text>
  <g transform="translate(48 158)">
    <rect width="260" height="150" rx="8" fill="#7f1d1d"/>
    <text x="24" y="48" fill="#fee2e2" font-family="Arial, sans-serif" font-size="20" font-weight="700">Author Response</text>
    <text x="24" y="108" fill="#fef2f2" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['hold-for-author-response'] || 0}</text>
  </g>
  <g transform="translate(350 158)">
    <rect width="260" height="150" rx="8" fill="#92400e"/>
    <text x="24" y="48" fill="#fef3c7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Provenance Review</text>
    <text x="24" y="108" fill="#fffbeb" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['needs-provenance-review'] || 0}</text>
  </g>
  <g transform="translate(652 158)">
    <rect width="260" height="150" rx="8" fill="#065f46"/>
    <text x="24" y="48" fill="#d1fae5" font-family="Arial, sans-serif" font-size="20" font-weight="700">Ready</text>
    <text x="24" y="108" fill="#ecfdf5" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['ready-for-review'] || 0}</text>
  </g>
  <text x="48" y="382" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="22">Checks: specimen source, biological context, cell-line authentication, mycoplasma, RRID, lot traceability</text>
  <text x="48" y="424" fill="#d1d5db" font-family="Arial, sans-serif" font-size="18">Reviewer findings: ${findings}. Outputs: JSON packet, Markdown report, SVG summary, MP4 artifact.</text>
  <text x="48" y="478" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">Synthetic data only. No patient data, private lab data, credentials, external APIs, or network calls.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'biomethods-provenance-packet.json'), `${packetJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'reviewer-report.md'), reviewerReport);
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
  const buffer = Buffer.alloc(width * height * 3, 18);
  for (let i = 0; i < width * height; i += 1) {
    buffer[i * 3] = 16;
    buffer[i * 3 + 1] = 24;
    buffer[i * 3 + 2] = 32;
  }
  const progress = frameIndex / Math.max(1, frameCount - 1);
  fillRect(buffer, width, 42, 54, 556, 42, [248, 250, 252]);
  fillRect(buffer, width, 42, 118, 160, 108, [127, 29, 29]);
  fillRect(buffer, width, 240, 118, 160, 108, [146, 64, 14]);
  fillRect(buffer, width, 438, 118, 160, 108, [6, 95, 70]);
  fillRect(buffer, width, 42, 258, Math.round(556 * progress), 26, [185, 230, 255]);
  fillRect(buffer, width, 42 + Math.round(480 * progress), 300, 72, 28, [248, 250, 252]);
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

console.log(`Wrote ${evaluations.length} biomethods evaluations to ${reportsDir}`);
console.log(`Decision counts: ${JSON.stringify(decisionCounts)}`);
console.log(`Reviewer findings: ${findings}`);
