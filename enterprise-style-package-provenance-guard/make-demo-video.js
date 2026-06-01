const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateStylePackage } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });

const clean = evaluateStylePackage(cleanPacket);
const risky = evaluateStylePackage(riskyPacket);
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
  const buffer = Buffer.alloc(width * height * 3, 250);
  fillRect(buffer, 0, 0, width, height, 248, 250, 252);
  fillRect(buffer, 56, 48, 848, 444, 255, 255, 255);
  fillRect(buffer, 56, 48, 848, 8, 17, 24, 39);

  const cleanWidth = Math.floor(328 * Math.min(1, progress * 1.7));
  const riskyWidth = Math.floor(328 * Math.max(0, (progress - 0.18) * 1.45));
  fillRect(buffer, 104, 116, 328, 64, 226, 232, 240);
  fillRect(buffer, 104, 116, cleanWidth, 64, 22, 163, 74);
  fillRect(buffer, 528, 116, 328, 64, 226, 232, 240);
  fillRect(buffer, 528, 116, riskyWidth, 64, 220, 38, 38);

  for (let i = 0; i < clean.summary.stylePackagesReviewed; i += 1) {
    fillRect(buffer, 128 + i * 84, 246, 56, 94, 16, 185, 129);
    fillRect(buffer, 136 + i * 84, 256, 40, 18, 255, 255, 255);
    fillRect(buffer, 136 + i * 84, 286, 40, 10, 255, 255, 255);
  }

  for (let i = 0; i < Math.min(12, risky.summary.findingCount); i += 1) {
    const barHeight = 30 + (i % 6) * 18;
    fillRect(buffer, 548 + i * 24, 386 - barHeight, 18, barHeight, 185, 28, 28);
  }

  fillRect(buffer, 104, 424, Math.floor(744 * progress), 18, 37, 99, 235);
  fillRect(buffer, 104, 454, Math.floor(560 * progress), 18, 217, 119, 6);

  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  fs.writeFileSync(path.join(framesDir, `frame-${String(index).padStart(3, "0")}.ppm`), Buffer.concat([header, buffer]));
}

for (let index = 0; index < frames; index += 1) {
  writeFrame(index, index / (frames - 1));
}

const output = path.join(reportsDir, "demo.mp4");
const result = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", [
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
