const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateChemicalIdentityGraph } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });

const clean = evaluateChemicalIdentityGraph(cleanPacket);
const risky = evaluateChemicalIdentityGraph(riskyPacket);
const width = 960;
const height = 540;
const frames = 72;
const fps = 18;

function setPixel(buffer, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const offset = (y * width + x) * 3;
  buffer[offset] = r;
  buffer[offset + 1] = g;
  buffer[offset + 2] = b;
}

function fillRect(buffer, x, y, w, h, r, g, b) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      setPixel(buffer, col, row, r, g, b);
    }
  }
}

function drawNodes(buffer, x, y, count, color) {
  for (let index = 0; index < count; index += 1) {
    fillRect(buffer, x + index * 54, y + (index % 2) * 28, 34, 34, color[0], color[1], color[2]);
  }
}

function writeFrame(index, progress) {
  const buffer = Buffer.alloc(width * height * 3, 248);
  fillRect(buffer, 0, 0, width, height, 248, 250, 252);
  fillRect(buffer, 48, 44, 864, 452, 255, 255, 255);
  fillRect(buffer, 48, 44, 864, 8, 15, 23, 42);

  const cleanWidth = Math.floor(300 * Math.min(1, progress * 1.5) * Math.max(0.04, clean.summary.compoundsReviewed / 5));
  const riskyWidth = Math.floor(300 * Math.max(0, (progress - 0.1) * 1.4) * Math.min(1, risky.summary.findingCount / 16));
  const heldWidth = Math.floor(300 * Math.max(0, (progress - 0.2) * 1.3) * Math.min(1, (risky.summary.heldNodes + risky.summary.heldEdges) / 8));

  fillRect(buffer, 96, 126, 300, 42, 226, 232, 240);
  fillRect(buffer, 96, 126, cleanWidth, 42, 16, 185, 129);
  fillRect(buffer, 96, 222, 300, 42, 226, 232, 240);
  fillRect(buffer, 96, 222, riskyWidth, 42, 239, 68, 68);
  fillRect(buffer, 96, 318, 300, 42, 226, 232, 240);
  fillRect(buffer, 96, 318, heldWidth, 42, 245, 158, 11);

  drawNodes(buffer, 110, 406, risky.summary.compoundsReviewed, [99, 102, 241]);
  drawNodes(buffer, 536, 214, risky.summary.criticalFindings, [153, 27, 27]);
  drawNodes(buffer, 536, 324, Math.min(8, risky.summary.findingCount), [220, 38, 38]);
  fillRect(buffer, 536, 436, Math.floor(310 * progress), 14, 37, 99, 235);

  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  fs.writeFileSync(path.join(framesDir, `frame-${String(index).padStart(3, "0")}.ppm`), Buffer.concat([header, buffer]));
}

for (let index = 0; index < frames; index += 1) {
  writeFrame(index, index / (frames - 1));
}

const output = path.join(reportsDir, "demo.mp4");
const result = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", [
  "-y",
  "-framerate",
  String(fps),
  "-i",
  path.join(framesDir, "frame-%03d.ppm"),
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  output
], { stdio: "inherit" });

fs.rmSync(framesDir, { recursive: true, force: true });

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Wrote ${output}`);
