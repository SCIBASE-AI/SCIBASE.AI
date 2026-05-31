const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const reportDir = path.join(__dirname, "reports");
const jsonPath = path.join(reportDir, "orcid-publication-claim-review.json");
const outputPath = path.join(reportDir, "demo.mp4");
const svgPath = path.join(reportDir, "orcid-publication-claim-review.svg");
const framePath = path.join(reportDir, "orcid-publication-claim-review.png");

if (!fs.existsSync(jsonPath)) {
  require("./demo");
}

const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (!fs.existsSync(svgPath)) {
  throw new Error(`missing SVG report: ${svgPath}`);
}

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

console.log(
  `wrote ${path.relative(process.cwd(), outputPath)} for ${report.summary.total} checked imports`
);
