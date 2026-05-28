const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { challenges } = require("./sample-data");
const { evaluateChallenges } = require("./index");

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 12;
const FRAMES = 48;

const FONT = {
  " ": ["000", "000", "000", "000", "000", "000", "000"],
  "#": ["01010", "11111", "01010", "01010", "11111", "01010", "00000"],
  ":": ["000", "010", "000", "000", "010", "000", "000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["000", "000", "000", "000", "000", "010", "010"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
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
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function color(hex) {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function fill(buffer, hex) {
  const [r, g, b] = color(hex);
  for (let index = 0; index < buffer.length; index += 3) {
    buffer[index] = r;
    buffer[index + 1] = g;
    buffer[index + 2] = b;
  }
}

function rect(buffer, x, y, width, height, hex) {
  const [r, g, b] = color(hex);
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(WIDTH, Math.floor(x + width));
  const endY = Math.min(HEIGHT, Math.floor(y + height));
  for (let py = startY; py < endY; py += 1) {
    for (let px = startX; px < endX; px += 1) {
      const offset = (py * WIDTH + px) * 3;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
    }
  }
}

function drawChar(buffer, ch, x, y, scale, hex) {
  const glyph = FONT[ch] || FONT[" "];
  for (let row = 0; row < glyph.length; row += 1) {
    for (let col = 0; col < glyph[row].length; col += 1) {
      if (glyph[row][col] === "1") {
        rect(buffer, x + col * scale, y + row * scale, scale, scale, hex);
      }
    }
  }
  return glyph[0].length * scale + scale;
}

function drawText(buffer, text, x, y, scale, hex) {
  let cursor = x;
  for (const ch of String(text).toUpperCase()) {
    cursor += drawChar(buffer, ch, cursor, y, scale, hex);
  }
}

function writePpm(file, buffer) {
  const header = Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`, "ascii");
  fs.writeFileSync(file, Buffer.concat([header, buffer]));
}

function renderFrame(report, frameIndex, file) {
  const buffer = Buffer.alloc(WIDTH * HEIGHT * 3);
  fill(buffer, "#0b1020");

  const progress = (frameIndex + 1) / FRAMES;
  const cards = [
    { label: "CLEAR", value: report.summary.clearForScoring, color: "#1c7ed6", x: 80 },
    { label: "HOLD", value: report.summary.heldForArbitration, color: "#d6336c", x: 460 },
    { label: "REJECT", value: report.summary.rejectLateSubmissionSets, color: "#f08c00", x: 840 },
  ];

  rect(buffer, 0, 0, WIDTH, 720, "#0b1020");
  rect(buffer, 72, 152, Math.round(1128 * progress), 5, "#4dabf7");
  rect(buffer, 70, 610, Math.round(1140 * progress), 12, "#2f9e44");

  drawText(buffer, "SCIBASE #18", 78, 64, 8, "#ffffff");
  drawText(buffer, "DEADLINE FAIRNESS GUARD", 78, 128, 6, "#cfe8ff");

  for (const card of cards) {
    rect(buffer, card.x, 246, 340, 226, card.color);
    rect(buffer, card.x + 14, 260, 312, 198, "#111827");
    drawText(buffer, card.label, card.x + 42, 296, 7, "#ffffff");
    drawText(buffer, String(card.value), card.x + 132, 364, 12, card.color);
  }

  drawText(buffer, `AVG SCORE ${report.summary.averageFairnessScore}`, 118, 520, 6, "#e7f5ff");
  drawText(buffer, "SYNTHETIC DATA ONLY", 118, 566, 5, "#adb5bd");

  writePpm(file, buffer);
}

function ffmpegCandidates() {
  return ["ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
}

function encodeFrames(framesDir, output) {
  const errors = [];
  for (const ffmpeg of ffmpegCandidates()) {
    const result = spawnSync(
      ffmpeg,
      [
        "-y",
        "-framerate",
        String(FPS),
        "-i",
        path.join(framesDir, "frame-%03d.ppm"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        output,
      ],
      { encoding: "utf8" },
    );

    if (result.status === 0 && fs.existsSync(output) && fs.statSync(output).size > 1000) {
      return;
    }

    const stderr = (result.stderr || result.error || "").toString();
    errors.push(`${ffmpeg}: ${stderr.split("\n").slice(-8).join("\n")}`);
  }

  throw new Error(`ffmpeg failed to encode demo video:\n${errors.join("\n")}`);
}

function main() {
  const report = evaluateChallenges(challenges);
  const reportDir = path.join(__dirname, "reports");
  const framesDir = path.join(reportDir, "video-frames");
  const output = path.join(reportDir, "demo.mp4");
  ensureDir(framesDir);

  for (let frame = 0; frame < FRAMES; frame += 1) {
    renderFrame(report, frame, path.join(framesDir, `frame-${String(frame).padStart(3, "0")}.ppm`));
  }

  encodeFrames(framesDir, output);
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`demo video generated: ${output}`);
}

main();
