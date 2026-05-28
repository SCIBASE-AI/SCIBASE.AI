'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const width = 640;
const height = 360;
const fps = 12;
const frames = 60;
const colors = {
  bg: [248, 250, 252],
  card: [255, 255, 255],
  border: [203, 213, 225],
  ink: [15, 23, 42],
  muted: [71, 85, 105],
  critical: [153, 27, 27],
  high: [220, 38, 38],
  medium: [245, 158, 11],
  low: [37, 99, 235]
};

const glyphs = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11110', '00000', '00000', '00000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
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
  V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '00100', '01010', '10001', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111']
};

function setPixel(buffer, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const index = (y * width + x) * 3;
  buffer[index] = color[0];
  buffer[index + 1] = color[1];
  buffer[index + 2] = color[2];
}

function rect(buffer, x, y, w, h, color) {
  for (let py = Math.max(0, y); py < Math.min(height, y + h); py++) {
    for (let px = Math.max(0, x); px < Math.min(width, x + w); px++) {
      setPixel(buffer, px, py, color);
    }
  }
}

function fill(buffer, color) {
  for (let i = 0; i < buffer.length; i += 3) {
    buffer[i] = color[0];
    buffer[i + 1] = color[1];
    buffer[i + 2] = color[2];
  }
}

function drawText(buffer, text, x, y, scale, color) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const pattern = glyphs[char] || glyphs[' '];
    for (let row = 0; row < pattern.length; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        if (pattern[row][col] === '1') {
          rect(buffer, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function writeFrame(filePath, buffer) {
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), Buffer.from(buffer)]));
}

function renderFrame(index, outputDir) {
  const buffer = Buffer.alloc(width * height * 3);
  const progress = (index + 1) / frames;
  fill(buffer, colors.bg);
  rect(buffer, 34, 30, 572, 300, colors.card);
  rect(buffer, 34, 30, 572, 3, colors.border);
  rect(buffer, 34, 327, 572, 3, colors.border);
  rect(buffer, 34, 30, 3, 300, colors.border);
  rect(buffer, 603, 30, 3, 300, colors.border);

  drawText(buffer, 'CLOSEOUT GUARD', 58, 58, 4, colors.ink);
  drawText(buffer, 'HOLD CLOSEOUT', 58, 104, 3, colors.muted);
  drawText(buffer, 'RISK SCORE 32', 58, 140, 3, colors.ink);

  const scale = Math.min(1, progress * 1.3);
  drawText(buffer, 'CRITICAL 2', 58, 188, 3, colors.ink);
  rect(buffer, 236, 186, Math.round(230 * scale), 26, colors.critical);
  drawText(buffer, 'HIGH 6', 58, 226, 3, colors.ink);
  rect(buffer, 236, 224, Math.round(205 * Math.max(0, progress - 0.15) * 1.35), 26, colors.high);
  drawText(buffer, 'MEDIUM 2', 58, 264, 3, colors.ink);
  rect(buffer, 236, 262, Math.round(120 * Math.max(0, progress - 0.3) * 1.6), 26, colors.medium);

  rect(buffer, 430, 105, 95, 95, colors.border);
  rect(buffer, 454, 129, 47, 47, index % 16 < 8 ? colors.high : colors.critical);
  drawText(buffer, 'REVOKE', 414, 218, 2, colors.muted);
  drawText(buffer, 'RETAIN', 414, 252, 2, colors.muted);

  writeFrame(path.join(outputDir, `frame${String(index).padStart(3, '0')}.ppm`), buffer);
}

function main() {
  const root = __dirname;
  const artifactsDir = path.join(root, 'artifacts');
  const outputPath = path.join(artifactsDir, 'demo.mp4');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'closeout-demo-'));
  fs.mkdirSync(artifactsDir, { recursive: true });

  for (let index = 0; index < frames; index++) renderFrame(index, tempDir);

  const result = spawnSync('ffmpeg', [
    '-y',
    '-framerate',
    String(fps),
    '-i',
    path.join(tempDir, 'frame%03d.ppm'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath
  ], { stdio: 'inherit' });

  fs.rmSync(tempDir, { recursive: true, force: true });
  if (result.status !== 0) throw new Error('ffmpeg failed to create demo.mp4');
  console.log(outputPath);
}

main();
