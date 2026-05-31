const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const reportDir = path.join(__dirname, "reports");
const jsonPath = path.join(reportDir, "organism-boundary-review.json");
const svgPath = path.join(reportDir, "organism-boundary-review.svg");
const framePath = path.join(reportDir, "organism-boundary-review.png");
const outputPath = path.join(reportDir, "demo.mp4");

if (!fs.existsSync(jsonPath) || !fs.existsSync(svgPath)) {
  require("./demo");
}

const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

execFileSync(
  "rsvg-convert",
  ["--width", "1280", "--height", "720", "--output", framePath, svgPath],
  { stdio: "inherit" }
);

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-loop",
    "1",
    "-framerate",
    "25",
    "-i",
    framePath,
    "-t",
    "4",
    "-pix_fmt",
    "yuv420p",
    "-vf",
    "scale=1280:720",
    "-movflags",
    "+faststart",
    outputPath,
  ],
  { stdio: "inherit" }
);

fs.unlinkSync(framePath);

console.log(
  `wrote ${path.relative(process.cwd(), outputPath)} for ${report.summary.edgeCount} biological edges`
);
