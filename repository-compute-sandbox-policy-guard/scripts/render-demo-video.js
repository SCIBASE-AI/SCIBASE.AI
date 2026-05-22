const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const reportsDir = path.join(__dirname, "..", "reports");
const reportPath = path.join(reportsDir, "demo.json");
const outputPath = path.join(reportsDir, "demo.mp4");

if (!fs.existsSync(reportPath)) {
  throw new Error("Run npm run demo before rendering the video.");
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const title = "SCIBASE compute sandbox policy guard";
const subtitle = `ready ${report.totals.ready}  review ${report.totals.needsReview}  blocked ${report.totals.blocked}`;
const detail = `blocking issues ${report.totals.blockingIssues}  warnings ${report.totals.warnings}`;
const fontArg = getFontArg();
const filters = [
  "drawbox=x=0:y=0:w=iw:h=ih:color=0x0b1020@1:t=fill",
  "drawbox=x=72:y=86:w=1136:h=548:color=0xffffff@0.94:t=fill",
  "drawbox=x=72:y=86:w=1136:h=18:color=0x157f57@1:t=fill",
  drawText(title, 112, 160, 42, "0x111827", fontArg),
  drawText("Project Repository and Version Control", 112, 220, 24, "0x374151", fontArg),
  drawText(subtitle, 112, 305, 34, "0x111827", fontArg),
  drawText(detail, 112, 365, 26, "0xb42318", fontArg),
  drawText(
    "Pins container images, constrains network egress, budgets compute, and blocks unsafe export.",
    112,
    450,
    22,
    "0x374151",
    fontArg,
  ),
  drawText("Synthetic data only. No external services or private repositories.", 112, 500, 22, "0x374151", fontArg),
].join(",");

const result = spawnSync(
  ffmpeg,
  [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x0b1020:s=1280x720:d=4:r=25",
    "-vf",
    filters,
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  throw new Error(`ffmpeg exited with status ${result.status}`);
}

console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);

function drawText(text, x, y, size, color, fontArg) {
  return `drawtext=${fontArg}:text='${escapeDrawtext(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}

function escapeDrawtext(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\'");
}

function getFontArg() {
  const candidates = [
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
  ];
  const font = candidates.find((candidate) => fs.existsSync(candidate));
  if (!font) {
    return "font=Sans";
  }
  return `fontfile='${font.replaceAll(":", "\\:")}'`;
}
