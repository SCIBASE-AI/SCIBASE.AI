const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const {
  evaluateFreshnessReview
} = require("../index");
const {
  freshnessPolicy,
  evidenceLedger,
  manuscriptPackets
} = require("../sample-data");

const moduleDir = path.join(__dirname, "..");
const reportsDir = path.join(moduleDir, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

function candidateFonts() {
  return [
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Windows\\Fonts\\segoeui.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf"
  ];
}

function resolveFontFile() {
  const font = candidateFonts().find((candidate) => fs.existsSync(candidate));
  if (!font) {
    throw new Error("No supported TrueType font file found for ffmpeg drawtext rendering.");
  }
  return font;
}

function escapeDrawtext(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\'")
    .replaceAll(",", "\\,");
}

function drawText(fontFile, text, x, y, size, color) {
  return `drawtext=fontfile='${escapeDrawtext(fontFile)}':text='${escapeDrawtext(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}

const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
const fontFile = resolveFontFile();
const report = evaluateFreshnessReview(manuscriptPackets, evidenceLedger, freshnessPolicy);
const output = path.join(reportsDir, "demo.mp4");
const filter = [
  "color=c=0xf8fafc:s=1280x720:d=5",
  drawText(fontFile, "Literature Freshness Review Assistant", 70, 70, 42, "0x0f172a"),
  drawText(fontFile, `Status: ${report.manuscripts[0].summary.status}`, 70, 145, 32, "0xb91c1c"),
  drawText(fontFile, `Reviewed manuscripts: ${report.aggregate.reviewedManuscripts}`, 70, 220, 28, "0x0f172a"),
  drawText(fontFile, `Held: ${report.aggregate.heldManuscripts}   Ready: ${report.aggregate.readyManuscripts}`, 70, 270, 28, "0x0f172a"),
  drawText(fontFile, `Critical freshness findings: ${report.aggregate.criticalFindings}`, 70, 340, 30, "0xdc2626"),
  drawText(fontFile, `Major freshness findings: ${report.aggregate.majorFindings}`, 70, 390, 30, "0xd97706"),
  drawText(fontFile, "Checks stale support, missing newer evidence, dataset drift, and benchmark drift.", 70, 475, 25, "0x334155"),
  drawText(fontFile, `Audit ${report.auditDigest.slice(0, 24)}`, 70, 635, 22, "0x475569")
].join(",");

const args = [
  "-y",
  "-f", "lavfi",
  "-i", filter,
  "-t", "5",
  "-pix_fmt", "yuv420p",
  "-c:v", "libx264",
  "-movflags", "+faststart",
  output
];

const result = spawnSync(ffmpegPath, args, {
  encoding: "utf8",
  stdio: "pipe",
  windowsHide: true
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  throw new Error(`ffmpeg failed with status ${result.status}`);
}

const stats = fs.statSync(output);
console.log(`wrote ${path.relative(process.cwd(), output)} (${stats.size} bytes) using ${path.basename(ffmpegPath)} on ${os.platform()}`);
