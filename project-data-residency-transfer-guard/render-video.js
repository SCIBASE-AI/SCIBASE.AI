const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const { evaluateResidencyTransfers } = require("./index");
const { scenarios } = require("./sample-data");

const reportDir = path.join(__dirname, "reports");
const mp4Path = path.join(reportDir, "demo.mp4");
const framePath = path.join(reportDir, "demo-frame.ppm");
const report = evaluateResidencyTransfers(scenarios);

function rgb(hex) {
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function rect(buffer, width, x, y, w, h, color) {
  const [r, g, b] = rgb(color);
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      const idx = (row * width + col) * 3;
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
    }
  }
}

const width = 960;
const height = 540;
const pixels = Buffer.alloc(width * height * 3, 0xf6);
for (let i = 0; i < pixels.length; i += 3) {
  pixels[i] = 0xf6;
  pixels[i + 1] = 0xf0;
  pixels[i + 2] = 0xdf;
}
rect(pixels, width, 52, 48, 856, 444, "fffaf0");
rect(pixels, width, 52, 48, 856, 4, "614a2f");
rect(pixels, width, 52, 488, 856, 4, "614a2f");
rect(pixels, width, 52, 48, 4, 444, "614a2f");
rect(pixels, width, 904, 48, 4, 444, "614a2f");
rect(pixels, width, 96, 160, Math.max(1, report.summary.approved) * 120, 58, "2f855a");
rect(pixels, width, 96, 248, Math.max(1, report.summary.needs_review) * 120, 58, "b7791f");
rect(pixels, width, 96, 336, Math.max(1, report.summary.blocked) * 120, 58, "b83232");
rect(pixels, width, 96, 432, 720, 12, "614a2f");
fs.writeFileSync(framePath, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]));

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-loop",
    "1",
    "-framerate",
    "24",
    "-i",
    framePath,
    "-t",
    "5",
    "-vf",
    "format=yuv420p",
    "-movflags",
    "+faststart",
    mp4Path,
  ],
  { stdio: "inherit" }
);

console.log(mp4Path);
