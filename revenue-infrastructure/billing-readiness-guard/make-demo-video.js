const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { buildInvoicePreview } = require("./index");
const { pricingCatalog, reviewContext, riskyLabAccount } = require("./sample-data");

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

  rect(data, 80, 82, 720, 34, "#101828");
  rect(data, 80, 132, 340 + frame * 24, 42, "#b42318");
  rect(data, 850, 82, 310, 92, "#fee4e2");
  rect(data, 890, 112, 230, 32, "#b42318");

  const maxLine = Math.max(...result.lines.map((item) => Math.abs(item.totalCents)), 1);
  result.lines.slice(0, 6).forEach((item, index) => {
    const y = 230 + index * 58;
    const barWidth = Math.round(760 * Math.abs(item.totalCents) / maxLine);
    rect(data, 120, y, 760, 34, "#eaecf0");
    rect(data, 120, y, Math.max(8, barWidth - frame * 4), 34, item.totalCents < 0 ? "#1570ef" : "#12b76a");
    rect(data, 910, y - 6, 120, 46, item.totalCents < 0 ? "#d1e9ff" : "#dcfae6");
    rect(data, 948, y + 10, 42, 14, item.totalCents < 0 ? "#1570ef" : "#12b76a");
  });

  const blockerCount = result.findings.filter((item) => item.severity === "blocker").length;
  for (let i = 0; i < blockerCount; i += 1) {
    rect(data, 120 + i * 92, 598 - frame * 4, 64, 42 + frame * 4, "#7a271a");
  }

  rect(data, 80, 646, 1080, 12, "#98a2b3");
  writePpm(filePath, data);
}

const result = buildInvoicePreview(riskyLabAccount, pricingCatalog, reviewContext);
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
