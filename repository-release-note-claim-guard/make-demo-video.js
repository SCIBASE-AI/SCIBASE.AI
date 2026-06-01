const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateReleasePacket } = require("./index");
const { cleanReleasePacket, riskyReleasePacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });

const clean = evaluateReleasePacket(cleanReleasePacket);
const risky = evaluateReleasePacket(riskyReleasePacket);
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
  fillRect(buffer, 48, 48, 864, 444, 255, 255, 255);
  fillRect(buffer, 48, 48, 864, 8, 17, 24, 39);

  const leftBar = Math.floor(340 * Math.min(1, progress * 1.8));
  const rightBar = Math.floor(340 * Math.max(0, (progress - 0.35) * 1.55));

  fillRect(buffer, 96, 118, 340, 84, 229, 231, 235);
  fillRect(buffer, 96, 118, leftBar, 84, 5, 150, 105);
  fillRect(buffer, 524, 118, 340, 84, 229, 231, 235);
  fillRect(buffer, 524, 118, rightBar, 84, 185, 28, 28);

  const cleanFindings = Math.max(1, clean.summary.releaseNotesReviewed);
  for (let i = 0; i < cleanFindings; i += 1) {
    fillRect(buffer, 110 + i * 58, 242, 42, 150, 16, 185, 129);
  }

  const riskyBars = Math.min(10, risky.summary.findingCount);
  for (let i = 0; i < riskyBars; i += 1) {
    const barHeight = 42 + (i % 5) * 24;
    fillRect(buffer, 540 + i * 28, 392 - barHeight, 20, barHeight, 220, 38, 38);
  }

  fillRect(buffer, 96, 430, Math.floor(768 * progress), 18, 37, 99, 235);
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
