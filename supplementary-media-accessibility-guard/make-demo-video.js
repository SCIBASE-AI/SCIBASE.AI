const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateMediaPacket } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });

const clean = evaluateMediaPacket(cleanPacket);
const risky = evaluateMediaPacket(riskyPacket);
const width = 960;
const height = 540;
const frames = 72;
const fps = 18;

function setPixel(buffer, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const offset = (y * width + x) * 3;
  buffer[offset] = r;
  buffer[offset + 1] = g;
  buffer[offset + 2] = b;
}

function fillRect(buffer, x, y, w, h, r, g, b) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      setPixel(buffer, col, row, r, g, b);
    }
  }
}

function writeFrame(index, progress) {
  const buffer = Buffer.alloc(width * height * 3, 248);
  fillRect(buffer, 0, 0, width, height, 248, 250, 252);
  fillRect(buffer, 54, 48, 852, 444, 255, 255, 255);
  fillRect(buffer, 54, 48, 852, 8, 15, 23, 42);

  const cleanWidth = Math.floor(320 * Math.min(1, progress * 1.7));
  const riskyWidth = Math.floor(320 * Math.max(0, (progress - 0.25) * 1.5));
  fillRect(buffer, 102, 108, 320, 68, 229, 231, 235);
  fillRect(buffer, 102, 108, cleanWidth, 68, 5, 150, 105);
  fillRect(buffer, 538, 108, 320, 68, 229, 231, 235);
  fillRect(buffer, 538, 108, riskyWidth, 68, 185, 28, 28);

  for (let i = 0; i < clean.summary.mediaReviewed; i += 1) {
    fillRect(buffer, 118 + i * 70, 238, 44, 116, 16, 185, 129);
    fillRect(buffer, 124 + i * 70, 248, 32, 24, 255, 255, 255);
  }

  for (let i = 0; i < Math.min(9, risky.summary.findingCount); i += 1) {
    const barHeight = 34 + (i % 5) * 22;
    fillRect(buffer, 548 + i * 30, 372 - barHeight, 22, barHeight, 220, 38, 38);
  }

  fillRect(buffer, 104, 430, Math.floor(752 * progress), 18, 37, 99, 235);
  fillRect(buffer, 104, 458, Math.floor(520 * progress), 18, 180, 83, 9);

  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  fs.writeFileSync(path.join(framesDir, `frame-${String(index).padStart(3, "0")}.ppm`), Buffer.concat([header, buffer]));
}

for (let index = 0; index < frames; index += 1) {
  writeFrame(index, index / (frames - 1));
}

const output = path.join(reportsDir, "demo.mp4");
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const result = spawnSync(ffmpeg, [
  "-y",
  "-framerate",
  String(fps),
  "-i",
  path.join(framesDir, "frame-%03d.ppm"),
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  output
], { stdio: "inherit" });

fs.rmSync(framesDir, { recursive: true, force: true });

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Wrote ${output}`);
