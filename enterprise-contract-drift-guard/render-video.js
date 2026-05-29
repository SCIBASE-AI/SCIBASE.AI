const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "reports");
fs.mkdirSync(outDir, { recursive: true });

const ppm = path.join(outDir, "demo-frame.ppm");
const mp4 = path.join(outDir, "demo.mp4");
const width = 960;
const height = 540;
const pixels = [];

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const inPanel = x > 80 && x < 880 && y > 90 && y < 450;
    const bar = y > 210 && y < 260 && x > 150 && x < 650;
    const okBar = y > 310 && y < 360 && x > 150 && x < 310;
    const r = inPanel ? (bar ? 214 : okBar ? 53 : 26) : 9;
    const g = inPanel ? (bar ? 69 : okBar ? 166 : 40) : 14;
    const b = inPanel ? (bar ? 69 : okBar ? 111 : 53) : 22;
    pixels.push(String.fromCharCode(r, g, b));
  }
}

fs.writeFileSync(ppm, `P6\n${width} ${height}\n255\n` + pixels.join(""), "binary");
execFileSync("ffmpeg", [
  "-y",
  "-loop", "1",
  "-framerate", "24",
  "-i", ppm,
  "-t", "5",
  "-vf", "format=yuv420p",
  "-movflags", "+faststart",
  mp4
], { stdio: "inherit" });

console.log(mp4);
