"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const WIDTH = 960;
const HEIGHT = 540;
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
  Y: ["10001", "01010", "00100", "00100", "00100", "00100", "00100"]
};

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });

for (const file of fs.readdirSync(framesDir)) {
  fs.unlinkSync(path.join(framesDir, file));
}

const slides = [
  { label: "DECISION PACK", color: [22, 121, 76], fill: 0.76 },
  { label: "THREAD ANCHOR", color: [22, 121, 76], fill: 0.68 },
  { label: "PRIVATE NOTE", color: [161, 27, 50], fill: 0.92 },
  { label: "EXPORT HOLD", color: [161, 92, 0], fill: 0.82 }
];

let frameIndex = 0;
for (const slide of slides) {
  for (let i = 0; i < 8; i += 1) {
    const progress = (i + 1) / 8;
    const buffer = createFrame(slide, progress);
    fs.writeFileSync(path.join(framesDir, `frame-${String(frameIndex).padStart(3, "0")}.ppm`), buffer);
    frameIndex += 1;
  }
}

const output = path.join(reportsDir, "demo.mp4");
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    "8",
    "-i",
    path.join(framesDir, "frame-%03d.ppm"),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output
  ],
  { stdio: "ignore" }
);

const stats = fs.statSync(output);
console.log(`Wrote ${output} (${stats.size} bytes)`);

function createFrame(slide, progress) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  fillRect(pixels, 0, 0, WIDTH, HEIGHT, [24, 33, 47]);
  fillRect(pixels, 48, 48, 864, 444, [248, 250, 252]);
  fillRect(pixels, 80, 192, 800, 86, [226, 232, 240]);
  fillRect(pixels, 80, 192, Math.round(800 * slide.fill * progress), 86, slide.color);
  fillRect(pixels, 80, 324, 220, 42, [226, 232, 240]);
  fillRect(pixels, 332, 324, 220, 42, [226, 232, 240]);
  fillRect(pixels, 584, 324, 220, 42, [226, 232, 240]);
  fillRect(pixels, 80, 324, 180, 42, [22, 121, 76]);
  fillRect(pixels, 332, 324, 120, 42, [161, 92, 0]);
  fillRect(pixels, 584, 324, 160, 42, [161, 27, 50]);
  drawText(pixels, "REVIEW DECISIONS", 82, 104, 5, [17, 24, 39]);
  drawText(pixels, slide.label, 108, 216, 7, [255, 255, 255]);
  drawText(pixels, "RELEASE EVIDENCE", 82, 416, 4, [51, 65, 85]);
  return Buffer.concat([Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`, "ascii"), pixels]);
}

function fillRect(pixels, x, y, width, height, color) {
  const x2 = Math.min(WIDTH, x + width);
  const y2 = Math.min(HEIGHT, y + height);
  for (let row = Math.max(0, y); row < y2; row += 1) {
    for (let col = Math.max(0, x); col < x2; col += 1) {
      const offset = (row * WIDTH + col) * 3;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
    }
  }
}

function drawText(pixels, text, x, y, scale, color) {
  let cursor = x;
  for (const rawChar of text) {
    const char = rawChar.toUpperCase();
    if (char === " ") {
      cursor += 4 * scale;
      continue;
    }
    const glyph = FONT[char];
    if (!glyph) {
      cursor += 6 * scale;
      continue;
    }
    glyph.forEach((row, rowIndex) => {
      for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
        if (row[colIndex] === "1") {
          fillRect(pixels, cursor + colIndex * scale, y + rowIndex * scale, scale, scale, color);
        }
      }
    });
    cursor += 6 * scale;
  }
}
