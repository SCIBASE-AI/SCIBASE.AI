"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "demo-frames");
const output = path.join(reportsDir, "demo.mp4");
const width = 960;
const height = 540;
const fps = 10;
const totalFrames = 80;

fs.mkdirSync(reportsDir, { recursive: true });

function drawStatus(canvas, label, value, x, y, color, progress) {
  drawText(canvas, `${label}: ${value}`, x, y, 3, [32, 33, 36]);
  drawRect(canvas, x, y + 42, 700, 22, [232, 227, 216]);
  drawRect(canvas, x, y + 42, Math.round(700 * progress), 22, color);
}

function createCanvas(canvasWidth, canvasHeight, color) {
  return {
    width: canvasWidth,
    height: canvasHeight,
    pixels: Buffer.alloc(canvasWidth * canvasHeight * 3, Buffer.from(color))
  };
}

function drawRect(canvas, x, y, rectWidth, rectHeight, color) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(canvas.width, Math.ceil(x + rectWidth));
  const y1 = Math.min(canvas.height, Math.ceil(y + rectHeight));
  for (let row = y0; row < y1; row += 1) {
    for (let col = x0; col < x1; col += 1) {
      setPixel(canvas, col, row, color);
    }
  }
}

function drawText(canvas, text, x, y, scale, color) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = FONT[char] ?? FONT[" "];
    glyph.forEach((row, rowIndex) => {
      for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
        if (row[colIndex] === "1") {
          drawRect(
            canvas,
            cursor + colIndex * scale,
            y + rowIndex * scale,
            scale,
            scale,
            color
          );
        }
      }
    });
    cursor += (glyph[0].length + 1) * scale;
  }
}

function writePpm(filePath, canvas) {
  const header = Buffer.from(`P6\n${canvas.width} ${canvas.height}\n255\n`);
  fs.writeFileSync(filePath, Buffer.concat([header, canvas.pixels]));
}

function setPixel(canvas, x, y, color) {
  const index = (y * canvas.width + x) * 3;
  canvas.pixels[index] = color[0];
  canvas.pixels[index + 1] = color[1];
  canvas.pixels[index + 2] = color[2];
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

const FONT = {
  " ": ["000", "000", "000", "000", "000", "000", "000"],
  ":": ["000", "010", "010", "000", "010", "010", "000"],
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
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
};

main();

function main() {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  for (let frame = 0; frame < totalFrames; frame += 1) {
    const progress = frame / (totalFrames - 1);
    const canvas = createCanvas(width, height, [31, 41, 51]);
    drawRect(canvas, 34, 34, 892, 472, [247, 245, 239]);
    drawRect(canvas, 42, 42, 876, 456, [255, 255, 255]);
    drawText(canvas, "SCIBASE SCIENTIFIC BOUNTY SYSTEM", 70, 74, 4, [32, 33, 36]);
    drawText(canvas, "DEBRIEF FEEDBACK RELEASE GUARD", 70, 122, 3, [72, 84, 94]);

    drawStatus(canvas, "CLEAN", "RELEASE", 92, 194, [77, 143, 122], clamp(progress * 2.2));
    drawStatus(
      canvas,
      "REVISION",
      "REVISE",
      92,
      286,
      [217, 130, 43],
      clamp((progress - 0.18) * 2.2)
    );
    drawStatus(
      canvas,
      "UNSAFE",
      "HOLD",
      92,
      378,
      [189, 47, 47],
      clamp((progress - 0.36) * 2.2)
    );

    drawText(canvas, "CHECKS RUBRIC APPEAL ANONYMITY IP PAYMENT", 70, 468, 2, [95, 104, 111]);
    writePpm(path.join(framesDir, `frame-${String(frame).padStart(4, "0")}.ppm`), canvas);
  }

  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(framesDir, "frame-%04d.ppm"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      output
    ],
    { encoding: "utf8" }
  );

  fs.rmSync(framesDir, { recursive: true, force: true });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  console.log(`Wrote demo video to ${output}`);
}
