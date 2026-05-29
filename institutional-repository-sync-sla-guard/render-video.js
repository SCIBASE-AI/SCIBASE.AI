const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const { evaluateSyncJobs } = require("./index");
const { syncJobs } = require("./sample-data");

const reportDir = path.join(__dirname, "reports");
const framePath = path.join(reportDir, "demo-frame.ppm");
const mp4Path = path.join(reportDir, "demo.mp4");
const report = evaluateSyncJobs(syncJobs);

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
const pixels = Buffer.alloc(width * height * 3);
for (let i = 0; i < pixels.length; i += 3) {
  pixels[i] = 0xee;
  pixels[i + 1] = 0xf3;
  pixels[i + 2] = 0xf7;
}
rect(pixels, width, 54, 52, 852, 436, "ffffff");
rect(pixels, width, 54, 52, 852, 4, "1f3349");
rect(pixels, width, 54, 484, 852, 4, "1f3349");
rect(pixels, width, 54, 52, 4, 436, "1f3349");
rect(pixels, width, 902, 52, 4, 436, "1f3349");
rect(pixels, width, 96, 180, Math.max(1, report.summary.ready) * 120, 58, "2f855a");
rect(pixels, width, 96, 270, Math.max(1, report.summary.needs_review) * 120, 58, "b7791f");
rect(pixels, width, 96, 360, Math.max(1, report.summary.blocked) * 120, 58, "b83232");
rect(pixels, width, 96, 450, 720, 12, "42566f");
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
