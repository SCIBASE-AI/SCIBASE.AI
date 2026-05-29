const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "reports");
fs.mkdirSync(outDir, { recursive: true });

const ppm = path.join(outDir, "demo-frame.ppm");
const mp4 = path.join(outDir, "demo.mp4");
const width = 960;
const height = 540;
let body = "";

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const panel = x > 90 && x < 870 && y > 80 && y < 460;
    const holdBar = x > 160 && x < 460 && y > 210 && y < 252;
    const recuseBar = x > 160 && x < 310 && y > 302 && y < 344;
    const r = panel ? (holdBar ? 196 : recuseBar ? 228 : 28) : 10;
    const g = panel ? (holdBar ? 63 : recuseBar ? 138 : 32) : 12;
    const b = panel ? (holdBar ? 77 : recuseBar ? 42 : 46) : 18;
    body += String.fromCharCode(r, g, b);
  }
}

fs.writeFileSync(ppm, `P6\n${width} ${height}\n255\n${body}`, "binary");
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
