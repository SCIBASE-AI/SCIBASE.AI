const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { runDemo } = require('./demo');

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01111', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '11110'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function rgb(hex) {
  const value = hex.replace('#', '');
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function createCanvas(width, height, background) {
  const buffer = Buffer.alloc(width * height * 3);
  fillRect(buffer, width, height, 0, 0, width, height, background);
  return buffer;
}

function fillRect(buffer, width, height, x, y, rectWidth, rectHeight, color) {
  const [r, g, b] = color;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + rectWidth));
  const y1 = Math.min(height, Math.ceil(y + rectHeight));
  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const offset = (py * width + px) * 3;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
    }
  }
}

function drawText(buffer, width, height, text, x, y, scale, color) {
  let cursor = x;
  for (const raw of String(text).toUpperCase()) {
    const glyph = FONT[raw] || FONT[' '];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === '1') {
          fillRect(buffer, width, height, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function writePpm(framePath, buffer, width, height) {
  fs.writeFileSync(framePath, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), buffer]));
}

function renderFrame(framePath, audit, frameIndex, totalFrames) {
  const width = 960;
  const height = 540;
  const bg = rgb('#0f172a');
  const slate = rgb('#334155');
  const ink = rgb('#0f172a');
  const paper = rgb('#f8fafc');
  const red = rgb('#dc2626');
  const amber = rgb('#ca8a04');
  const green = rgb('#16a34a');
  const buffer = createCanvas(width, height, bg);
  const progress = frameIndex / Math.max(1, totalFrames - 1);

  fillRect(buffer, width, height, 46, 42, 868, 456, paper);
  fillRect(buffer, width, height, 46, 42, 868, 78, rgb('#e2e8f0'));
  fillRect(buffer, width, height, 76, 388, 808, 24, rgb('#cbd5e1'));
  fillRect(buffer, width, height, 76, 388, 808 * progress, 24, audit.decision === 'block-release' ? red : amber);

  drawText(buffer, width, height, 'GIT LFS POINTER GUARD', 76, 72, 5, ink);
  drawText(buffer, width, height, `DECISION ${audit.decision.replace('-', ' ')}`, 76, 146, 4, red);
  drawText(buffer, width, height, `${audit.summary.blockers} BLOCKERS  ${audit.summary.holds} HOLDS`, 76, 206, 4, slate);
  drawText(buffer, width, height, 'CHECKS SHA SIZE MANIFEST QUOTA', 76, 256, 3, slate);
  drawText(buffer, width, height, 'JSON MD SVG MP4 GENERATED', 76, 316, 3, green);
  drawText(buffer, width, height, 'SYNTHETIC DATA ONLY', 76, 440, 3, slate);

  writePpm(framePath, buffer, width, height);
}

function renderVideo() {
  const outputDir = path.join(__dirname, 'reports');
  fs.mkdirSync(outputDir, { recursive: true });
  const { audit } = runDemo(outputDir);
  const outputPath = path.join(outputDir, 'demo.mp4');
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfs-video-'));
  const frameCount = 120;

  for (let i = 0; i < frameCount; i += 1) {
    renderFrame(path.join(framesDir, `frame-${String(i).padStart(3, '0')}.ppm`), audit, i, frameCount);
  }

  const result = spawnSync(
    'ffmpeg',
    ['-y', '-framerate', '30', '-i', path.join(framesDir, 'frame-%03d.ppm'), '-an', '-pix_fmt', 'yuv420p', outputPath],
    { encoding: 'utf8' },
  );

  fs.rmSync(framesDir, { recursive: true, force: true });

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed:\n${result.stderr}`);
  }

  console.log(`Video written: ${outputPath}`);
  return outputPath;
}

if (require.main === module) {
  renderVideo();
}

module.exports = { renderVideo };
