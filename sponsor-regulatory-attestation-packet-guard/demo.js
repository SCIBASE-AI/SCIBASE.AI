"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  evaluateSponsorAttestation,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const sampleData = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluateSponsorAttestation(sampleData);
const jsonPath = path.join(reportsDir, "sponsor-regulatory-attestation-packet.json");
const markdownPath = path.join(reportsDir, "sponsor-regulatory-attestation-report.md");
const svgPath = path.join(reportsDir, "summary.svg");
const mp4Path = path.join(reportsDir, "demo.mp4");
const framesDir = path.join(reportsDir, "demo-frames");

fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdownReport(result));
fs.writeFileSync(svgPath, renderSvgSummary(result));

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16)
  ];
}

function drawRect(buffer, width, x, y, rectWidth, rectHeight, color) {
  const [red, green, blue] = hexToRgb(color);
  const xEnd = Math.min(width, x + rectWidth);
  const yEnd = Math.min(720, y + rectHeight);
  for (let row = Math.max(0, y); row < yEnd; row += 1) {
    for (let col = Math.max(0, x); col < xEnd; col += 1) {
      const offset = (row * width + col) * 3;
      buffer[offset] = red;
      buffer[offset + 1] = green;
      buffer[offset + 2] = blue;
    }
  }
}

function writePpmFrame(filePath, progress) {
  const width = 1280;
  const height = 720;
  const buffer = Buffer.alloc(width * height * 3);
  drawRect(buffer, width, 0, 0, width, height, "#f8fafc");
  drawRect(buffer, width, 64, 64, 1152, 592, "#ffffff");
  drawRect(buffer, width, 64, 64, 1152, 4, "#d8dee7");
  drawRect(buffer, width, 64, 652, 1152, 4, "#d8dee7");
  drawRect(buffer, width, 64, 64, 4, 592, "#d8dee7");
  drawRect(buffer, width, 1212, 64, 4, 592, "#d8dee7");
  drawRect(buffer, width, 96, 112, 900, 18, "#1b1f24");
  drawRect(buffer, width, 96, 166, 620, 12, "#5b6572");
  drawRect(buffer, width, 96, 218, 840, 10, "#5b6572");

  const statuses = [
    [result.summary.readyCount, "#176b3a"],
    [result.summary.holdCount, "#8a5a00"],
    [result.summary.blockCount, "#9d1c2f"],
    [result.summary.findingCount, "#116d6e"]
  ];
  const max = Math.max(1, ...statuses.map(([count]) => count));
  statuses.forEach(([count, color], index) => {
    const y = 284 + index * 72;
    const barWidth = Math.round((count / max) * 650 * progress);
    drawRect(buffer, width, 96, y + 12, 168, 18, "#5b6572");
    drawRect(buffer, width, 296, y, Math.max(6, barWidth), 42, color);
  });
  drawRect(buffer, width, 96, 590, Math.round(880 * progress), 10, "#116d6e");

  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  fs.writeFileSync(filePath, Buffer.concat([header, buffer]));
}

fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
for (let frame = 0; frame < 36; frame += 1) {
  const progress = Math.min(1, (frame + 1) / 24);
  writePpmFrame(path.join(framesDir, `frame-${String(frame).padStart(3, "0")}.ppm`), progress);
}

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-framerate",
  "6",
  "-i",
  path.join(framesDir, "frame-%03d.ppm"),
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  mp4Path
], { encoding: "utf8" });

fs.rmSync(framesDir, { recursive: true, force: true });

if (ffmpeg.status !== 0) {
  fs.writeFileSync(path.join(reportsDir, "demo-mp4-fallback.txt"), [
    "ffmpeg was not able to render demo.mp4 in this environment.",
    "The SVG and Markdown demo artifacts were still generated.",
    "",
    ffmpeg.stderr || ffmpeg.stdout || "No ffmpeg output."
  ].join("\n"));
} else if (fs.existsSync(path.join(reportsDir, "demo-mp4-fallback.txt"))) {
  fs.unlinkSync(path.join(reportsDir, "demo-mp4-fallback.txt"));
}

console.log(`Decision: ${result.releaseDecision}`);
console.log(`Challenges: ${result.summary.challengeCount}`);
console.log(`Ready: ${result.summary.readyCount}`);
console.log(`Held: ${result.summary.holdCount}`);
console.log(`Blocked: ${result.summary.blockCount}`);
console.log(`Critical findings: ${result.summary.criticalCount}`);
console.log(`Warnings: ${result.summary.warningCount}`);
console.log(`Audit digest: ${result.auditDigest}`);
console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), svgPath)}`);
if (fs.existsSync(mp4Path)) {
  console.log(`Wrote ${path.relative(process.cwd(), mp4Path)}`);
}
