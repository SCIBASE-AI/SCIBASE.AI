const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { evaluateStatisticalPower } = require("./index");
const { reviewContext, underpoweredManuscript } = require("./sample-data");

const WIDTH = 1280;
const HEIGHT = 720;
const outputDir = path.join(__dirname, "reports");
const frameDir = path.join(outputDir, "ppm-frames");
fs.mkdirSync(frameDir, { recursive: true });

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

function writePpm(filePath, data) {
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`), data]));
}

function renderBars(filePath, result, frame) {
  const data = canvas("#f7f8fa");
  rect(data, 36, 36, 1208, 648, "#ffffff");
  rect(data, 36, 36, 1208, 3, "#d0d5dd");
  rect(data, 36, 681, 1208, 3, "#d0d5dd");
  rect(data, 36, 36, 3, 648, "#d0d5dd");
  rect(data, 1241, 36, 3, 648, "#d0d5dd");

  rect(data, 80, 82, 760, 34, "#101828");
  rect(data, 80, 132, Math.round(760 * (result.riskScore / 100)), 42, "#b42318");
  rect(data, 870, 82, 290, 92, "#fee4e2");
  rect(data, 902, 112, 226, 32, "#b42318");

  result.endpointReviews.forEach((endpoint, index) => {
    const y = 238 + index * 118;
    const ratio = endpoint.requiredN ? Math.min(1, endpoint.effectiveN / endpoint.requiredN) : 0;
    rect(data, 120, y, 850, 42, "#eaecf0");
    rect(data, 120, y, Math.round(850 * ratio), 42, ratio >= 1 ? "#12b76a" : "#f04438");
    rect(data, 1000, y - 8, 96, 58, ratio >= 1 ? "#dcfae6" : "#fee4e2");
    rect(data, 1030, y + 12, 36, 18, ratio >= 1 ? "#12b76a" : "#f04438");
  });

  const findingCount = Math.min(8, result.findings.length);
  for (let i = 0; i < findingCount; i += 1) {
    const x = 120 + i * 120;
    const item = result.findings[i];
    const color = item.severity === "blocker" ? "#7a271a" : item.severity === "high" ? "#b42318" : "#f79009";
    const height = item.severity === "blocker" ? 118 : item.severity === "high" ? 86 : 56;
    rect(data, x, 570 - height - frame * 2, 72, height + frame * 2, color);
  }

  rect(data, 80, 618, 1080, 20, "#344054");
  rect(data, 80, 648, 1080, 12, "#98a2b3");
  writePpm(filePath, data);
}

const result = evaluateStatisticalPower(underpoweredManuscript, reviewContext);
for (let frame = 0; frame < 4; frame += 1) {
  renderBars(path.join(frameDir, `frame-${String(frame + 1).padStart(3, "0")}.ppm`), result, frame);
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
