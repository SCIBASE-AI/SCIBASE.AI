const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { auditDeletionEscrow } = require("./index");
const { auditPolicy, riskyProject, riskyRequest } = require("./sample-data");

const WIDTH = 1280;
const HEIGHT = 720;
const outputDir = path.join(__dirname, "reports");
const frameDir = path.join(outputDir, "ppm-frames");
fs.mkdirSync(frameDir, { recursive: true });

function rgb(hex) {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
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

function writePpm(filePath, data) {
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`), data]));
}

function renderFrame(filePath, result, frame) {
  const data = canvas("#f7f8fa");
  rect(data, 36, 36, 1208, 648, "#ffffff");
  rect(data, 36, 36, 1208, 3, "#d0d5dd");
  rect(data, 36, 681, 1208, 3, "#d0d5dd");
  rect(data, 36, 36, 3, 648, "#d0d5dd");
  rect(data, 1241, 36, 3, 648, "#d0d5dd");

  rect(data, 80, 82, 800, 34, "#101828");
  rect(data, 80, 132, Math.round(800 * result.riskScore / 100), 42, "#b42318");
  rect(data, 900, 82, 260, 92, "#fee4e2");
  rect(data, 936, 112, 188, 32, "#b42318");

  const severities = ["blocker", "high", "medium", "low"];
  const counts = severities.map((severity) => result.findings.filter((item) => item.severity === severity).length);
  const maxCount = Math.max(...counts, 1);
  counts.forEach((count, index) => {
    const y = 228 + index * 78;
    const width = Math.round(820 * count / maxCount);
    const color = severities[index] === "blocker" ? "#7a271a" : severities[index] === "high" ? "#b42318" : severities[index] === "medium" ? "#f79009" : "#667085";
    rect(data, 120, y, 820, 42, "#eaecf0");
    rect(data, 120, y, Math.max(10, width - frame * 4), 42, color);
    rect(data, 980, y - 8, 96, 58, "#fee4e2");
    rect(data, 1012, y + 12, 36, 18, color);
  });

  rect(data, 80, 650, 1080, 12, "#98a2b3");
  writePpm(filePath, data);
}

const result = auditDeletionEscrow(riskyProject, riskyRequest, auditPolicy);
for (let frame = 0; frame < 4; frame += 1) {
  renderFrame(path.join(frameDir, `frame-${String(frame + 1).padStart(3, "0")}.ppm`), result, frame);
}

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
