const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { sampleProject } = require("./sample-data");
const { buildSentinelReport, toMarkdown, toSvg } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = buildSentinelReport(sampleProject);
const jsonPath = path.join(reportsDir, "retraction-notice-packet.json");
const markdownPath = path.join(reportsDir, "retraction-notice-report.md");
const svgPath = path.join(reportsDir, "summary.svg");
const videoPath = path.join(reportsDir, "demo.mp4");

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, toMarkdown(report));
fs.writeFileSync(svgPath, toSvg(report));
writeDemoVideo(report, videoPath);

console.log(`decision=${report.releaseGate.status}`);
console.log(`score=${report.summary.score}`);
console.log(`blockers=${report.summary.blockers}`);
console.log(`quarantinedClaims=${report.summary.quarantinedClaims}`);
console.log(`auditDigest=${report.auditDigest}`);
console.log(`wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(`wrote ${path.relative(process.cwd(), videoPath)}`);

function writeDemoVideo(report, outputPath) {
  const lines = [
    "Retraction Notice Citation Sentinel",
    `Gate ${report.releaseGate.status.toUpperCase()} | Score ${report.summary.score}`,
    `References checked ${report.summary.referencesChecked} | Claims checked ${report.summary.claimsChecked}`,
    `Blockers ${report.summary.blockers} | Quarantined claims ${report.summary.quarantinedClaims}`,
    "Retracted primary evidence is quarantined before reviewer packets are shown",
    `Digest ${report.auditDigest.slice(0, 24)}`
  ];

  const drawFilters = lines.map((line, index) => {
    const size = index === 0 ? 46 : 31;
    const color = index === 0 ? "white" : index === 1 ? "0xFDE68A" : "0xE5E7EB";
    return `drawtext=fontcolor=${color}:fontsize=${size}:x=70:y=${78 + index * 82}:text='${escapeDrawtext(line)}'`;
  });
  const filter = drawFilters.join(",");

  const result = spawnSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x0F172A:s=1280x720:d=4",
    "-vf",
    filter,
    "-pix_fmt",
    "yuv420p",
    "-c:v",
    "libx264",
    "-movflags",
    "+faststart",
    outputPath
  ], { encoding: "utf8" });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr}`);
  }
}

function escapeDrawtext(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}
