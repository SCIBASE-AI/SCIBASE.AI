"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { analyzeManuscript } = require("./index");
const { neuroCalmManuscript } = require("./sample-data");

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 12;
const FRAMES = 48;

const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  6: ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
};

function rgb(hex) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function createCanvas(fill) {
  const buffer = Buffer.alloc(WIDTH * HEIGHT * 3);
  const [r, g, b] = rgb(fill);
  for (let index = 0; index < buffer.length; index += 3) {
    buffer[index] = r;
    buffer[index + 1] = g;
    buffer[index + 2] = b;
  }
  return buffer;
}

function rect(buffer, x, y, width, height, color) {
  const [r, g, b] = rgb(color);
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(WIDTH, Math.floor(x + width));
  const y1 = Math.min(HEIGHT, Math.floor(y + height));
  for (let row = y0; row < y1; row += 1) {
    for (let col = x0; col < x1; col += 1) {
      const index = (row * WIDTH + col) * 3;
      buffer[index] = r;
      buffer[index + 1] = g;
      buffer[index + 2] = b;
    }
  }
}

function text(buffer, value, x, y, scale, color) {
  const normalized = String(value).toUpperCase().replace(/[^A-Z0-9 /-]/g, " ");
  let cursor = x;
  for (const char of normalized) {
    const glyph = FONT[char] || FONT[" "];
    glyph.forEach((line, row) => {
      [...line].forEach((bit, col) => {
        if (bit === "1") {
          rect(buffer, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      });
    });
    cursor += 6 * scale;
  }
}

function writeFrame(file, buffer) {
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`), buffer]));
}

function main() {
  const report = analyzeManuscript(neuroCalmManuscript, { currentYear: 2026 });
  const reportsDir = path.join(__dirname, "reports");
  const framesDir = path.join(reportsDir, "ppm-frames");
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const riskWidth = Math.round(report.summary.riskScore * 8.6);
  const unsupportedWidth = Math.round(
    (report.summary.unsupportedOrContradictedClaims / report.summary.claimsReviewed) * 860
  );

  for (let frame = 0; frame < FRAMES; frame += 1) {
    const progress = Math.min(1, (frame + 1) / 28);
    const buffer = createCanvas("#07111f");
    rect(buffer, 54, 52, 1172, 616, "#101c2f");
    rect(buffer, 54, 52, 1172, 4, "#29415f");
    rect(buffer, 54, 664, 1172, 4, "#29415f");
    rect(buffer, 54, 52, 4, 616, "#29415f");
    rect(buffer, 1222, 52, 4, 616, "#29415f");

    text(buffer, "CITATION CLAIM GROUNDING", 86, 86, 7, "#ffffff");
    text(buffer, "SYNTHETIC SCIBASE ISSUE 16 REVIEW", 88, 146, 4, "#b9c8dd");
    text(buffer, "DECISION REVISE BEFORE SUBMISSION", 88, 232, 5, "#ffcf5a");
    text(buffer, `RISK SCORE ${report.summary.riskScore} OF 100`, 88, 292, 5, "#ffffff");
    rect(buffer, 88, 346, 860, 32, "#273854");
    rect(buffer, 88, 346, riskWidth * progress, 32, "#ff6b6b");
    text(buffer, `${report.findings.length} FINDINGS ${report.summary.criticalFindings} CRITICAL`, 88, 416, 5, "#d9e5f5");
    rect(buffer, 88, 474, 860, 32, "#273854");
    rect(buffer, 88, 474, unsupportedWidth * progress, 32, "#7cc4ff");
    text(
      buffer,
      `${report.summary.unsupportedOrContradictedClaims} OF ${report.summary.claimsReviewed} CLAIMS UNSUPPORTED`,
      88,
      544,
      5,
      "#d9e5f5"
    );
    text(buffer, `AUDIT ${report.summary.auditDigest}`, 88, 616, 4, "#90a9c7");
    writeFrame(path.join(framesDir, `frame-${String(frame).padStart(3, "0")}.ppm`), buffer);
  }

  const output = path.join(reportsDir, "demo.mp4");
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      path.join(framesDir, "frame-%03d.ppm"),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      output,
    ],
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
