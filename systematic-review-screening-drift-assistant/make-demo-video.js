const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateSystematicReviewScreening } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });

const clean = evaluateSystematicReviewScreening(cleanPacket);
const risky = evaluateSystematicReviewScreening(riskyPacket);
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
  fillRect(buffer, 56, 48, 848, 444, 255, 255, 255);
  fillRect(buffer, 56, 48, 848, 8, 15, 23, 42);

  const cleanWidth = Math.floor(302 * Math.min(1, progress * 1.7));
  const riskyWidth = Math.floor(302 * Math.max(0, (progress - 0.15) * 1.5));
  fillRect(buffer, 96, 112, 302, 58, 226, 232, 240);
  fillRect(buffer, 96, 112, cleanWidth, 58, 16, 185, 129);
  fillRect(buffer, 560, 112, 302, 58, 226, 232, 240);
  fillRect(buffer, 560, 112, riskyWidth, 58, 239, 68, 68);

  const cleanStudies = clean.summary.studiesReviewed;
  for (let i = 0; i < cleanStudies; i += 1) {
    fillRect(buffer, 116 + i * 76, 234, 48, 96, 20, 184, 166);
    fillRect(buffer, 124 + i * 76, 248, 32, 12, 255, 255, 255);
    fillRect(buffer, 124 + i * 76, 276, 32, 12, 255, 255, 255);
  }

  for (let i = 0; i < Math.min(13, risky.summary.findingCount); i += 1) {
    const barHeight = 26 + (i % 7) * 15;
    const color = i < risky.summary.criticalFindings ? [127, 29, 29] : [220, 38, 38];
    fillRect(buffer, 560 + i * 22, 370 - barHeight, 16, barHeight, color[0], color[1], color[2]);
  }

  fillRect(buffer, 96, 418, Math.floor(340 * progress), 18, 37, 99, 235);
  fillRect(buffer, 96, 448, Math.floor(602 * progress), 18, 217, 119, 6);

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
