const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const width = 960;
const height = 540;
const ppm = path.join(reportsDir, "demo-frame.ppm");
const mp4 = path.join(reportsDir, "demo.mp4");

function pixel(x, y) {
  if (y < 112) return [23, 32, 51];
  if (x > 46 && x < 914 && y > 126 && y < 188) return [255, 255, 255];
  if (x > 46 && x < 914 && y > 210 && y < 272) return [255, 255, 255];
  if (x > 46 && x < 914 && y > 294 && y < 356) return [255, 255, 255];
  if (x > 46 && x < 914 && y > 378 && y < 440) return [255, 255, 255];
  if (x > 64 && x < 238 && y > 140 && y < 174) return [4, 120, 87];
  if (x > 64 && x < 238 && y > 224 && y < 258) return [4, 120, 87];
  if (x > 64 && x < 238 && y > 308 && y < 342) return [180, 83, 9];
  if (x > 64 && x < 238 && y > 392 && y < 426) return [180, 83, 9];
  return [248, 250, 252];
}

const header = `P6\n${width} ${height}\n255\n`;
const body = Buffer.alloc(width * height * 3);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * 3;
    const [r, g, b] = pixel(x, y);
    body[offset] = r;
    body[offset + 1] = g;
    body[offset + 2] = b;
  }
}
fs.writeFileSync(ppm, Buffer.concat([Buffer.from(header), body]));

const result = spawnSync("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-framerate",
  "24",
  "-i",
  ppm,
  "-t",
  "5",
  "-vf",
  "format=yuv420p",
  "-movflags",
  "+faststart",
  mp4
], { stdio: "inherit" });

if (result.status !== 0) {
  throw new Error("ffmpeg failed to render demo video");
}

console.log(mp4);
