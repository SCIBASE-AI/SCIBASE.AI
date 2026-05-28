"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const packet = require("./fixtures/completion-packet.json");
const { reviewCompletionReputation } = require("./index");

const report = reviewCompletionReputation(packet);
const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, ".frames");
const outPath = path.join(reportsDir, "demo.mp4");
const width = 1280;
const height = 720;

fs.mkdirSync(framesDir, { recursive: true });

for (let frame = 0; frame < 48; frame += 1) {
  const progress = frame / 47;
  const buffer = Buffer.alloc(width * height * 3);
  paintRect(buffer, width, 0, 0, width, height, [248, 250, 252]);
  paintRect(buffer, width, 70, 60, 1140, 108, [15, 23, 42]);
  paintRect(buffer, width, 70, 220, 1140, 56, [226, 232, 240]);
  paintRect(buffer, width, 70, 220, Math.round(1140 * progress * (report.riskScore / 100)), 56, [220, 38, 38]);

  const bands = [
    [report.severityCounts.critical, [153, 27, 27]],
    [report.severityCounts.high, [180, 83, 9]],
    [report.severityCounts.medium, [29, 78, 216]],
    [report.severityCounts.low, [21, 128, 61]]
  ];

  bands.forEach(([count, color], index) => {
    const y = 350 + index * 58;
    paintRect(buffer, width, 90, y, 42, 34, color);
    paintRect(buffer, width, 170, y, Math.max(1, Math.round(count * 76 * progress)), 34, color);
  });

  paintRect(buffer, width, 70, 620, Math.round(1140 * progress * (report.releaseReadiness / 100)), 24, [22, 163, 74]);

  const ppm = Buffer.concat([
    Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii"),
    buffer
  ]);
  fs.writeFileSync(path.join(framesDir, `frame-${String(frame).padStart(3, "0")}.ppm`), ppm);
}

const ffmpeg = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    "12",
    "-i",
    path.join(framesDir, "frame-%03d.ppm"),
    "-vf",
    "format=yuv420p",
    "-movflags",
    "+faststart",
    outPath
  ],
  { stdio: "inherit" }
);

fs.rmSync(framesDir, { recursive: true, force: true });

if (ffmpeg.status !== 0) {
  throw new Error("ffmpeg failed to create demo.mp4");
}

console.log(`wrote ${outPath}`);

function paintRect(buffer, width, x, y, rectWidth, rectHeight, color) {
  const maxX = Math.min(width, x + rectWidth);
  const maxY = Math.min(height, y + rectHeight);

  for (let row = Math.max(0, y); row < maxY; row += 1) {
    for (let col = Math.max(0, x); col < maxX; col += 1) {
      const offset = (row * width + col) * 3;
      buffer[offset] = color[0];
      buffer[offset + 1] = color[1];
      buffer[offset + 2] = color[2];
    }
  }
}
