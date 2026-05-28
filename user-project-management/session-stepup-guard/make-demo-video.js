const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { evaluateSessionStepUp } = require("./index");
const { riskyPacket } = require("./sample-data");

const WIDTH = 1280;
const HEIGHT = 720;
const outputDir = path.join(__dirname, "reports");
const frameDir = path.join(outputDir, "ppm-frames");
fs.mkdirSync(frameDir, { recursive: true });

const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
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
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "#": ["01010", "11111", "01010", "01010", "11111", "01010", "01010"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function rgb(hex) {
  const clean = hex.replace("#", "");
  return [Number.parseInt(clean.slice(0, 2), 16), Number.parseInt(clean.slice(2, 4), 16), Number.parseInt(clean.slice(4, 6), 16)];
}

function canvas(color) {
  const data = Buffer.alloc(WIDTH * HEIGHT * 3);
  const [r, g, b] = rgb(color);
  for (let offset = 0; offset < data.length; offset += 3) {
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
  }
  return data;
}

function rect(data, x, y, width, height, color) {
  const [r, g, b] = rgb(color);
  for (let row = Math.max(0, y); row < Math.min(HEIGHT, y + height); row += 1) {
    for (let col = Math.max(0, x); col < Math.min(WIDTH, x + width); col += 1) {
      const offset = (row * WIDTH + col) * 3;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
    }
  }
}

function text(data, value, x, y, scale, color) {
  const [r, g, b] = rgb(color);
  let cursor = x;
  String(value).toUpperCase().split("").forEach((char) => {
    const glyph = GLYPHS[char] || GLYPHS[" "];
    glyph.forEach((line, gy) => {
      line.split("").forEach((pixel, gx) => {
        if (pixel !== "1") return;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            const px = cursor + gx * scale + sx;
            const py = y + gy * scale + sy;
            if (px < 0 || px >= WIDTH || py < 0 || py >= HEIGHT) continue;
            const offset = (py * WIDTH + px) * 3;
            data[offset] = r;
            data[offset + 1] = g;
            data[offset + 2] = b;
          }
        }
      });
    });
    cursor += 6 * scale;
  });
}

function writePpm(filePath, data) {
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`), data]));
}

function renderFrame(filePath, subtitle, lines, result) {
  const data = canvas("#f7f8fa");
  rect(data, 36, 36, 1208, 648, "#ffffff");
  rect(data, 36, 36, 1208, 3, "#d0d5dd");
  rect(data, 36, 681, 1208, 3, "#d0d5dd");
  rect(data, 36, 36, 3, 648, "#d0d5dd");
  rect(data, 1241, 36, 3, 648, "#d0d5dd");
  text(data, "PROJECT SESSION STEP UP GUARD", 56, 74, 5, "#101828");
  text(data, subtitle, 56, 126, 3, "#475467");
  rect(data, 56, 166, 390, 54, "#b42318");
  text(data, "DENY UNTIL STEP UP", 76, 184, 4, "#ffffff");
  text(data, `RISK SCORE ${result.riskScore}`, 476, 184, 4, "#101828");
  lines.forEach((line, index) => text(data, line, 56, 260 + index * 62, 4, "#111827"));
  text(data, "JSON MARKDOWN SVG MP4 REVIEWER ARTIFACTS", 56, 592, 3, "#344054");
  text(data, `AUDIT DIGEST ${result.auditDigest.toUpperCase()}`, 56, 638, 3, "#667085");
  writePpm(filePath, data);
}

const result = evaluateSessionStepUp(riskyPacket);
const frames = [
  ["SCIBASE ISSUE #11 AUTH POSTURE REVIEW", ["BLOCKER STEP UP REQUIRED", "HIGH UNTRUSTED DEVICE", "HIGH IMPOSSIBLE TRAVEL"]],
  ["PROJECT ACTION RISK GATING", ["HIGH STALE SESSION", "HIGH MANAGED DEVICE REQUIRED", "MEDIUM NEW DEVICE"]],
  ["RESTRICTED EXPORT PROTECTION", ["MEDIUM HARDWARE KEY GAP", "ACTION REQUIRE FRESH MFA", "ACTION NOTIFY PROJECT OWNERS"]],
  ["DETERMINISTIC REVIEW PACKET", ["SYNTHETIC SESSION DATA ONLY", "NO IDP CALLS OR CREDENTIALS", "READY FOR MAINTAINER REVIEW"]],
];

frames.forEach(([subtitle, lines], index) => {
  renderFrame(path.join(frameDir, `frame-${String(index + 1).padStart(3, "0")}.ppm`), subtitle, lines, result);
});

const outputPath = path.join(outputDir, "demo.mp4");
execFileSync("ffmpeg", [
  "-y",
  "-framerate",
  "1",
  "-i",
  path.join(frameDir, "frame-%03d.ppm"),
  "-vf",
  "fps=12,format=yuv420p",
  "-movflags",
  "+faststart",
  outputPath,
], { stdio: "inherit" });

fs.rmSync(frameDir, { recursive: true, force: true });
console.log(`demo video=${outputPath}`);
