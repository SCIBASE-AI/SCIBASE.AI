"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { analyzeChallengePayout } = require("./index");
const { biomarkerChallenge } = require("./sample-data");

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 12;
const FRAMES = 48;

function rgb(hex) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function canvas(fill) {
  const buffer = Buffer.alloc(WIDTH * HEIGHT * 3);
  const [r, g, b] = rgb(fill);
  for (let i = 0; i < buffer.length; i += 3) {
    buffer[i] = r;
    buffer[i + 1] = g;
    buffer[i + 2] = b;
  }
  return buffer;
}

function rect(buffer, x, y, width, height, color) {
  const [r, g, b] = rgb(color);
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const right = Math.min(WIDTH, Math.floor(x + width));
  const bottom = Math.min(HEIGHT, Math.floor(y + height));
  for (let row = top; row < bottom; row += 1) {
    for (let col = left; col < right; col += 1) {
      const index = (row * WIDTH + col) * 3;
      buffer[index] = r;
      buffer[index + 1] = g;
      buffer[index + 2] = b;
    }
  }
}

function writeFrame(file, buffer) {
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`), buffer]));
}

function main() {
  const report = analyzeChallengePayout(biomarkerChallenge);
  const reportsDir = path.join(__dirname, "reports");
  const framesDir = path.join(reportsDir, "ppm-frames");
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const bars = [
    { y: 250, width: 860 * (report.summary.escrowedCents / report.summary.requiredEscrowCents), color: "#ff6b6b" },
    { y: 350, width: 860 * (report.summary.milestoneTotalCents / report.summary.prizeCents), color: "#ffa94d" },
    { y: 450, width: 860 * (report.summary.splitTotal / 100), color: "#7cc4ff" },
    { y: 550, width: 860 * (report.summary.riskScore / 100), color: "#ffcf5a" },
  ];

  for (let frame = 0; frame < FRAMES; frame += 1) {
    const progress = Math.min(1, (frame + 1) / 30);
    const buffer = canvas("#07111f");
    rect(buffer, 54, 52, 1172, 616, "#101c2f");
    rect(buffer, 54, 52, 1172, 4, "#29415f");
    rect(buffer, 54, 664, 1172, 4, "#29415f");
    rect(buffer, 54, 52, 4, 616, "#29415f");
    rect(buffer, 1222, 52, 4, 616, "#29415f");
    rect(buffer, 88, 102, 760, 42, "#ffffff");
    rect(buffer, 88, 168, 460, 22, "#b9c8dd");
    rect(buffer, 88, 205, 640, 22, "#b9c8dd");
    for (const bar of bars) {
      rect(buffer, 88, bar.y, 860, 36, "#273854");
      rect(buffer, 88, bar.y, bar.width * progress, 36, bar.color);
    }
    rect(buffer, 992, 250, 92, 92, "#ff6b6b");
    rect(buffer, 1100, 250, 92, 92, "#ff6b6b");
    rect(buffer, 992, 372, 92, 92, "#ffa94d");
    rect(buffer, 1100, 372, 92, 92, "#7cc4ff");
    rect(buffer, 992, 494, 200, 48, report.summary.decision === "hold-award-routing" ? "#ffcf5a" : "#7cc4ff");
    writeFrame(path.join(framesDir, `frame-${String(frame).padStart(3, "0")}.ppm`), buffer);
  }

  const output = path.join(reportsDir, "demo.mp4");
  const result = spawnSync(
    "ffmpeg",
    ["-y", "-framerate", String(FPS), "-i", path.join(framesDir, "frame-%03d.ppm"), "-pix_fmt", "yuv420p", "-movflags", "+faststart", output],
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    throw new Error("ffmpeg failed to create demo video");
  }
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`demo video=${output}`);
}

if (require.main === module) {
  main();
}
