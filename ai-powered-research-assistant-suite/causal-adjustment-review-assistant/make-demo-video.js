const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { auditCausalAdjustment } = require("./index");
const { samplePacket } = require("./sample-data");

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 12;
const FRAMES = 48;

const FONT = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
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

function color(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function fill(buffer, fillColor) {
  for (let index = 0; index < buffer.length; index += 3) {
    buffer[index] = fillColor[0];
    buffer[index + 1] = fillColor[1];
    buffer[index + 2] = fillColor[2];
  }
}

function rect(buffer, x, y, width, height, fillColor) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(WIDTH, Math.floor(x + width));
  const y1 = Math.min(HEIGHT, Math.floor(y + height));
  for (let row = y0; row < y1; row += 1) {
    for (let col = x0; col < x1; col += 1) {
      const index = (row * WIDTH + col) * 3;
      buffer[index] = fillColor[0];
      buffer[index + 1] = fillColor[1];
      buffer[index + 2] = fillColor[2];
    }
  }
}

function text(buffer, phrase, x, y, scale, fillColor) {
  let cursor = x;
  for (const rawChar of phrase.toUpperCase()) {
    const glyph = FONT[rawChar] || FONT[" "];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === "1") rect(buffer, cursor + col * scale, y + row * scale, scale, scale, fillColor);
      }
    }
    cursor += 6 * scale;
  }
}

function writePpm(filePath, buffer) {
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`), buffer]));
}

function frame(frameIndex, report) {
  const buffer = Buffer.alloc(WIDTH * HEIGHT * 3);
  fill(buffer, color("#f8fafc"));
  rect(buffer, 56, 52, 1168, 616, color("#ffffff"));
  rect(buffer, 56, 52, 1168, 8, color("#b91c1c"));
  rect(buffer, 92, 112, 18 + frameIndex * 12, 18, color("#b91c1c"));
  text(buffer, "CAUSAL ADJUSTMENT REVIEW", 92, 96, 6, color("#0f172a"));
  text(buffer, `DECISION ${report.decision}`, 92, 184, 5, color("#b91c1c"));
  text(buffer, `RISK ${report.riskScore}/100`, 92, 250, 5, color("#334155"));
  text(buffer, `FINDINGS ${report.findingCount} DIGEST ${report.evidenceDigest}`, 92, 310, 4, color("#475569"));
  rect(buffer, 92, 365, 700, 34, color("#e2e8f0"));
  rect(buffer, 92, 365, Math.round((report.riskScore / 100) * 700), 34, color("#b91c1c"));

  const lines = [
    "MISSING CONFOUNDERS",
    "COLLIDER ADJUSTMENT",
    "POST TREATMENT VARIABLE",
    "NEGATIVE CONTROL FAILURE",
  ];
  for (let index = 0; index < lines.length; index += 1) {
    const visible = frameIndex > 8 + index * 7;
    rect(buffer, 92, 442 + index * 44, visible ? 20 : 8, 20, visible ? color("#b91c1c") : color("#cbd5e1"));
    text(buffer, lines[index], 130, 434 + index * 44, 3, color("#334155"));
  }
  text(buffer, "SYNTHETIC MANUSCRIPT PACKET ONLY", 92, 632, 3, color("#64748b"));
  return buffer;
}

const report = auditCausalAdjustment(samplePacket);
const reportsDir = path.join(__dirname, "reports");
const frameDir = path.join(reportsDir, "ppm-frames");
fs.mkdirSync(frameDir, { recursive: true });

for (let index = 0; index < FRAMES; index += 1) {
  writePpm(path.join(frameDir, `frame-${String(index + 1).padStart(3, "0")}.ppm`), frame(index, report));
}

const outputPath = path.join(reportsDir, "demo.mp4");
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    path.join(frameDir, "frame-%03d.ppm"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ],
  { stdio: "inherit" },
);

for (const file of fs.readdirSync(frameDir)) fs.unlinkSync(path.join(frameDir, file));
fs.rmdirSync(frameDir);

console.log(`demo video=${outputPath}`);
