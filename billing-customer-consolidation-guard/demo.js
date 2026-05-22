const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const {
  evaluateBillingCustomerConsolidation,
  buildFinanceReviewPacket,
} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
const framesDir = path.join(reportsDir, 'frames');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateBillingCustomerConsolidation(scenario),
}));

const decisionCounts = evaluations.reduce((counts, item) => {
  counts[item.decision] = (counts[item.decision] || 0) + 1;
  return counts;
}, {});
const totalOpenReceivable = evaluations.reduce((sum, item) => sum + item.summary.openReceivableCents, 0);
const totalCreditBalance = evaluations.reduce((sum, item) => sum + item.summary.creditBalanceCents, 0);
const totalFindings = evaluations.reduce((sum, item) => sum + item.findings.length, 0);

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const packetJson = JSON.stringify(evaluations, null, 2);
const reviewerPacket = evaluations.map(buildFinanceReviewPacket).join('\n---\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#10201c"/>
  <text x="48" y="70" fill="#f8fafc" font-family="Arial, sans-serif" font-size="32" font-weight="700">Billing Customer Consolidation Guard</text>
  <text x="48" y="110" fill="#b7f7df" font-family="Arial, sans-serif" font-size="18">Revenue-control packet for duplicate customer profile merges</text>
  <g transform="translate(48 156)">
    <rect width="260" height="148" rx="8" fill="#7f1d1d"/>
    <text x="24" y="46" fill="#fee2e2" font-family="Arial, sans-serif" font-size="20" font-weight="700">Blocked</text>
    <text x="24" y="108" fill="#fef2f2" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['block-consolidation'] || 0}</text>
  </g>
  <g transform="translate(350 156)">
    <rect width="260" height="148" rx="8" fill="#854d0e"/>
    <text x="24" y="46" fill="#fef3c7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Finance Review</text>
    <text x="24" y="108" fill="#fffbeb" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['finance-review'] || 0}</text>
  </g>
  <g transform="translate(652 156)">
    <rect width="260" height="148" rx="8" fill="#166534"/>
    <text x="24" y="46" fill="#dcfce7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Ready</text>
    <text x="24" y="108" fill="#f0fdf4" font-family="Arial, sans-serif" font-size="56" font-weight="700">${decisionCounts['ready-to-consolidate'] || 0}</text>
  </g>
  <text x="48" y="372" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="22">Open receivables preserved: ${money(totalOpenReceivable)} | Credit balances preserved: ${money(totalCreditBalance)}</text>
  <text x="48" y="416" fill="#d1d5db" font-family="Arial, sans-serif" font-size="18">Checks: legal identity, duplicate subscriptions, payment evidence, credit lots, invoices, analytics seats</text>
  <text x="48" y="470" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">Synthetic data only. No customer secrets, payment processor calls, bank data, ERP, SSO, or live billing systems.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'consolidation-packet.json'), `${packetJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'finance-review-packet.md'), reviewerPacket);
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
    buffer[i * 3] = 16;
    buffer[i * 3 + 1] = 32;
    buffer[i * 3 + 2] = 28;
  }
  const progress = frameIndex / Math.max(1, frameCount - 1);
  fillRect(buffer, width, 42, 42, 556, 44, [248, 250, 252]);
  fillRect(buffer, width, 42, 112, 160, 118, [127, 29, 29]);
  fillRect(buffer, width, 240, 112, 160, 118, [133, 77, 14]);
  fillRect(buffer, width, 438, 112, 160, 118, [22, 101, 52]);
  fillRect(buffer, width, 42, 266, Math.round(556 * progress), 28, [183, 247, 223]);
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

console.log(`Wrote ${evaluations.length} consolidation evaluations to ${reportsDir}`);
console.log(`Decision counts: ${JSON.stringify(decisionCounts)}`);
console.log(`Open receivables: ${money(totalOpenReceivable)}`);
console.log(`Credit balances: ${money(totalCreditBalance)}`);
console.log(`Findings: ${totalFindings}`);
