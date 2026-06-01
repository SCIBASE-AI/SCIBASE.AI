const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateChallengeWithdrawal } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });

const clean = evaluateChallengeWithdrawal(cleanPacket);
const risky = evaluateChallengeWithdrawal(riskyPacket);
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

function drawColumns(buffer, x, baseline, count, color) {
  for (let index = 0; index < count; index += 1) {
    const barHeight = 26 + (index % 6) * 17;
    fillRect(buffer, x + index * 26, baseline - barHeight, 18, barHeight, color[0], color[1], color[2]);
  }
}

function writeFrame(index, progress) {
  const buffer = Buffer.alloc(width * height * 3, 248);
  fillRect(buffer, 0, 0, width, height, 248, 250, 252);
  fillRect(buffer, 48, 44, 864, 452, 255, 255, 255);
  fillRect(buffer, 48, 44, 864, 8, 15, 23, 42);

  const cleanWidth = Math.floor(300 * Math.min(1, progress * 1.5) * (clean.summary.recommendedReimbursementUsd / 2600));
  const riskyWidth = Math.floor(300 * Math.max(0, (progress - 0.08) * 1.4) * (risky.summary.recommendedReimbursementUsd / 2600));
  const shortfallWidth = Math.floor(300 * Math.max(0, (progress - 0.18) * 1.3) * (risky.summary.fundedShortfallUsd / 2600));

  fillRect(buffer, 96, 126, 300, 42, 226, 232, 240);
  fillRect(buffer, 96, 126, cleanWidth, 42, 16, 185, 129);
  fillRect(buffer, 96, 222, 300, 42, 226, 232, 240);
  fillRect(buffer, 96, 222, riskyWidth, 42, 239, 68, 68);
  fillRect(buffer, 96, 318, 300, 42, 226, 232, 240);
  fillRect(buffer, 96, 318, shortfallWidth, 42, 245, 158, 11);

  for (let i = 0; i < risky.summary.affectedSolvers; i += 1) {
    fillRect(buffer, 112 + i * 78, 404, 52, 52, 99, 102, 241);
    fillRect(buffer, 122 + i * 78, 416, 32, 8, 255, 255, 255);
    fillRect(buffer, 122 + i * 78, 434, 32, 8, 255, 255, 255);
  }

  drawColumns(buffer, 536, 408, Math.min(12, risky.summary.findingCount), [220, 38, 38]);
  drawColumns(buffer, 536, 210, clean.summary.findingCount, [16, 185, 129]);
  fillRect(buffer, 536, 436, Math.floor(310 * progress), 14, 37, 99, 235);

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
