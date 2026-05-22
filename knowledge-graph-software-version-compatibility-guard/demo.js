const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const {
  evaluateSoftwareVersionCompatibility,
  buildSoftwareCompatibilityReviewPacket,
} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
const framesDir = path.join(reportsDir, 'frames');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateSoftwareVersionCompatibility(scenario),
}));

const decisionCounts = evaluations.reduce((counts, item) => {
  counts[item.decision] = (counts[item.decision] || 0) + 1;
  return counts;
}, {});
const totals = evaluations.reduce(
  (sum, item) => {
    sum.paths += item.summary.totalPathCount;
    sum.suppressed += item.summary.suppressedPathCount;
    sum.review += item.summary.reviewPathCount;
    sum.findings += item.summary.findingCount;
    sum.actions += item.summary.actionCount;
    return sum;
  },
  {paths: 0, suppressed: 0, review: 0, findings: 0, actions: 0}
);

const packetJson = JSON.stringify(evaluations, null, 2);
const reviewerPacket = evaluations.map(buildSoftwareCompatibilityReviewPacket).join('\n---\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#17202a"/>
  <text x="48" y="72" fill="#f8fafc" font-family="Arial, sans-serif" font-size="31" font-weight="700">Software Version Compatibility Graph Guard</text>
  <text x="48" y="112" fill="#a7f3d0" font-family="Arial, sans-serif" font-size="18">Preflight runtime, package, container, workflow, and lockfile evidence before graph recommendations show</text>
  <g transform="translate(48 154)">
    <rect width="260" height="148" rx="8" fill="#7f1d1d"/>
    <text x="24" y="46" fill="#fee2e2" font-family="Arial, sans-serif" font-size="20" font-weight="700">Suppressed</text>
    <text x="24" y="108" fill="#fef2f2" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['suppress-recommendation'] || 0}</text>
  </g>
  <g transform="translate(350 154)">
    <rect width="260" height="148" rx="8" fill="#854d0e"/>
    <text x="24" y="46" fill="#fef3c7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Curator Review</text>
    <text x="24" y="108" fill="#fffbeb" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['curator-review'] || 0}</text>
  </g>
  <g transform="translate(652 154)">
    <rect width="260" height="148" rx="8" fill="#166534"/>
    <text x="24" y="46" fill="#dcfce7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Visible</text>
    <text x="24" y="108" fill="#f0fdf4" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['show-recommendation'] || 0}</text>
  </g>
  <text x="48" y="374" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="22">Paths: ${totals.paths} | Suppressed: ${totals.suppressed} | Review: ${totals.review} | Findings: ${totals.findings} | Actions: ${totals.actions}</text>
  <text x="48" y="418" fill="#d1d5db" font-family="Arial, sans-serif" font-size="18">Checks: semver ranges, immutable container digests, workflow engine ranges, lockfile presence, runtime capture freshness</text>
  <text x="48" y="472" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">Synthetic graph fixtures only. No package registry, container registry, dataset, credential, or network calls.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'compatibility-review.json'), `${packetJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'software-compatibility-review.md'), reviewerPacket);
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), svg);

function fillRect(buffer, width, x0, y0, rectWidth, rectHeight, color) {
  const [r, g, b] = color;
  const height = Math.floor(buffer.length / (width * 3));
  const x1 = Math.min(width, x0 + rectWidth);
  const y1 = Math.min(height, y0 + rectHeight);
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
    buffer[i * 3] = 23;
    buffer[i * 3 + 1] = 32;
    buffer[i * 3 + 2] = 42;
  }

  const progress = frameIndex / Math.max(1, frameCount - 1);
  fillRect(buffer, width, 40, 40, 560, 40, [248, 250, 252]);
  fillRect(buffer, width, 40, 106, 150, 122, [127, 29, 29]);
  fillRect(buffer, width, 245, 106, 150, 122, [133, 77, 14]);
  fillRect(buffer, width, 450, 106, 150, 122, [22, 101, 52]);
  fillRect(buffer, width, 78, 257, 112, 32, [248, 113, 113]);
  fillRect(buffer, width, 264, 257, 112, 32, [251, 191, 36]);
  fillRect(buffer, width, 450, 257, 112, 32, [74, 222, 128]);
  fillRect(buffer, width, 40, 318, Math.round(560 * progress), 18, [167, 243, 208]);
  fillRect(buffer, width, 40 + Math.round(512 * progress), 309, 48, 36, [241, 245, 249]);

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
    output,
  ], {encoding: 'utf8'});

  fs.rmSync(framesDir, {recursive: true, force: true});
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffmpeg failed');
  }
}

createDemoVideo();

console.log(JSON.stringify({
  scenarios: evaluations.length,
  reportsDir,
  decisions: decisionCounts,
  totals,
}, null, 2));
