const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {buildMarkdownReport, buildSummarySVG, evaluateStorageOverage} = require('./index');
const {storageAccounts} = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportDir, {recursive: true});

const evaluation = evaluateStorageOverage(storageAccounts);
const packetPath = path.join(reportDir, 'storage-overage-packet.json');
const markdownPath = path.join(reportDir, 'storage-overage-report.md');
const svgPath = path.join(reportDir, 'summary.svg');
const mp4Path = path.join(reportDir, 'demo.mp4');
const framePath = path.join(reportDir, 'summary-frame.ppm');
const videoNotePath = path.join(reportDir, 'demo-video-note.txt');

function drawRect(buffer, width, x, y, rectWidth, rectHeight, color) {
  for (let row = Math.max(0, y); row < Math.min(540, y + rectHeight); row += 1) {
    for (let col = Math.max(0, x); col < Math.min(width, x + rectWidth); col += 1) {
      const offset = (row * width + col) * 3;
      buffer[offset] = color[0];
      buffer[offset + 1] = color[1];
      buffer[offset + 2] = color[2];
    }
  }
}

function writePPMFrame(evaluationResult, outputPath) {
  const width = 960;
  const height = 540;
  const pixels = Buffer.alloc(width * height * 3, 248);
  drawRect(pixels, width, 48, 42, 864, 456, [255, 255, 255]);
  drawRect(pixels, width, 48, 42, 864, 3, [203, 213, 225]);
  drawRect(pixels, width, 48, 495, 864, 3, [203, 213, 225]);
  drawRect(pixels, width, 70, 82, 620, 18, [15, 23, 42]);
  drawRect(pixels, width, 70, 122, Math.min(760, Math.round(evaluationResult.summary.monthlyRecoverableUSD * 3)), 18, [14, 116, 144]);
  drawRect(pixels, width, 70, 150, Math.min(760, Math.round(evaluationResult.summary.unmeteredLeakageUSD * 20)), 18, [217, 119, 6]);

  const maxCharge = Math.max(...evaluationResult.accounts.map((account) => account.chargesUSD.total), 1);
  evaluationResult.accounts.forEach((account, index) => {
    const y = 218 + index * 78;
    const widthForCharge = Math.max(12, Math.round((account.chargesUSD.total / maxCharge) * 520));
    const color = account.decision === 'hold_for_ops_review' ? [217, 119, 6] : account.decision === 'invoice_ready' ? [14, 116, 144] : [100, 116, 139];
    drawRect(pixels, width, 70, y, 610, 2, [226, 232, 240]);
    drawRect(pixels, width, 70, y + 18, widthForCharge, 28, color);
  });

  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  fs.writeFileSync(outputPath, Buffer.concat([header, pixels]));
}

fs.writeFileSync(packetPath, `${JSON.stringify(evaluation, null, 2)}\n`);
fs.writeFileSync(markdownPath, buildMarkdownReport(evaluation));
fs.writeFileSync(svgPath, buildSummarySVG(evaluation));
writePPMFrame(evaluation, framePath);
if (fs.existsSync(videoNotePath)) {
  fs.unlinkSync(videoNotePath);
}

try {
  execFileSync('ffmpeg', [
    '-y',
    '-loop',
    '1',
    '-t',
    '6',
    '-i',
    framePath,
    '-vf',
    'scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p',
    '-c:v',
    'libx264',
    '-movflags',
    '+faststart',
    mp4Path,
  ], {stdio: 'ignore'});
} catch (error) {
  fs.writeFileSync(videoNotePath, `ffmpeg was not available or failed: ${error.message}\n`);
} finally {
  if (fs.existsSync(framePath)) {
    fs.unlinkSync(framePath);
  }
}

console.log(`Wrote ${packetPath}`);
console.log(`Wrote ${markdownPath}`);
console.log(`Wrote ${svgPath}`);
if (fs.existsSync(mp4Path)) {
  console.log(`Wrote ${mp4Path}`);
}
