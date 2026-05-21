const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { evaluateReviewCivility, writeReportBundle } = require("./index");
const { samplePacket } = require("./sample-data");

const moduleDir = __dirname;
const reportsDir = path.join(moduleDir, "reports");
const result = evaluateReviewCivility(samplePacket);
const paths = writeReportBundle(result, reportsDir);
const pngPath = path.join(reportsDir, "summary.png");
const mp4Path = path.join(reportsDir, "demo.mp4");

function runCommand(command, args) {
  const child = spawnSync(command, args, { encoding: "utf8" });
  if (child.status !== 0) {
    throw new Error(`${command} failed: ${child.stderr || child.stdout}`);
  }
  return child;
}

if (fs.existsSync(paths.svgPath)) {
  runCommand("rsvg-convert", ["-w", "1280", "-h", "720", paths.svgPath, "-o", pngPath]);
  runCommand("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    pngPath,
    "-t",
    "12",
    "-vf",
    "format=yuv420p",
    "-c:v",
    "libx264",
    "-movflags",
    "+faststart",
    mp4Path
  ]);
}

console.log(
  [
    `status=${result.status}`,
    `blockers=${result.summary.blockers}`,
    `warnings=${result.summary.warnings}`,
    `redactions=${result.summary.redactions}`,
    `report=${paths.markdownPath}`,
    `packet=${paths.jsonPath}`,
    `demo=${mp4Path}`
  ].join("\n")
);
