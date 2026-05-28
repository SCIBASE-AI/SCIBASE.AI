"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const fixture = require("./fixtures/proteomics-study.json");
const { reviewProteomicsEvidence } = require("./index");

const report = reviewProteomicsEvidence(fixture);
const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, ".frames");
const outPath = path.join(reportsDir, "demo.mp4");
const width = 1280;
const height = 720;

fs.mkdirSync(framesDir, { recursive: true });

for (let frame = 0; frame < 48; frame += 1) {
  const phase = frame / 47;
  const buffer = Buffer.alloc(width * height * 3);
  paintBackground(buffer, width, height, [248, 250, 252]);
  paintRect(buffer, width, 80, 70, 1120, 110, [15, 23, 42]);
  paintRect(buffer, width, 80, 230, 1120, 54, [226, 232, 240]);
  paintRect(buffer, width, 80, 230, Math.round(1120 * (report.riskScore / 100) * phase), 54, [220, 38, 38]);

  const severities = [
    ["critical", report.severityCounts.critical, [185, 28, 28]],
    ["high", report.severityCounts.high, [217, 119, 6]],
    ["medium", report.severityCounts.medium, [37, 99, 235]],
    ["low", report.severityCounts.low, [22, 163, 74]]
  ];

  severities.forEach(([, count, color], index) => {
    const y = 360 + index * 58;
    paintRect(buffer, width, 160, y, Math.max(1, Math.round(count * 72 * phase)), 34, color);
    paintRect(buffer, width, 80, y, 48, 34, color);
  });

  paintRect(buffer, width, 80, 620, Math.round(1120 * (report.readinessScore / 100) * phase), 24, [22, 163, 74]);
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

function paintBackground(buffer, width, height, color) {
  paintRect(buffer, width, 0, 0, width, height, color);
}

function paintRect(buffer, width, x, y, rectWidth, rectHeight, color) {
  const xEnd = Math.min(width, x + rectWidth);
  const yEnd = Math.min(height, y + rectHeight);

  for (let row = Math.max(0, y); row < yEnd; row += 1) {
    for (let col = Math.max(0, x); col < xEnd; col += 1) {
      const offset = (row * width + col) * 3;
      buffer[offset] = color[0];
      buffer[offset + 1] = color[1];
      buffer[offset + 2] = color[2];
    }
  }
}
