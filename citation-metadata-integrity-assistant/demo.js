const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { sampleCitationBatch } = require("./sample-data");
const { buildMetadataIntegrityReport, toMarkdown, toSvg } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const report = buildMetadataIntegrityReport(sampleCitationBatch);
const jsonPath = path.join(reportsDir, "citation-metadata-packet.json");
const markdownPath = path.join(reportsDir, "citation-metadata-report.md");
const svgPath = path.join(reportsDir, "summary.svg");
const videoPath = path.join(reportsDir, "demo.mp4");

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, toMarkdown(report));
fs.writeFileSync(svgPath, toSvg(report));
writeDemoVideo(report, videoPath);

console.log(`decision=${report.decision.status}`);
console.log(`score=${report.summary.score}`);
console.log(`deferred=${report.summary.deferredReferences}`);
console.log(`duplicates=${report.summary.duplicateGroups}`);
console.log(`auditDigest=${report.auditDigest}`);
console.log(`wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(`wrote ${path.relative(process.cwd(), videoPath)}`);

function writeDemoVideo(report, outputPath) {
  const lines = [
    "Citation Metadata Integrity Assistant",
    `Gate ${report.decision.status.toUpperCase()} | Score ${report.summary.score}`,
    `References ${report.summary.referencesChecked} | Duplicate groups ${report.summary.duplicateGroups}`,
    `Deferred ${report.summary.deferredReferences} | Revisions ${report.summary.revisionReferences}`,
    "Malformed identifiers and duplicate bibliography rows are held before insert",
    `Digest ${report.auditDigest.slice(0, 24)}`
  ];
  const drawFilters = lines.map((line, index) => {
    const size = index === 0 ? 46 : 31;
    const color = index === 0 ? "white" : index === 1 ? "0xFDE68A" : "0xE5E7EB";
    return `drawtext=fontcolor=${color}:fontsize=${size}:x=70:y=${78 + index * 82}:text='${escapeDrawtext(line)}'`;
  });

  const result = spawnSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x111827:s=1280x720:d=4",
    "-vf",
    drawFilters.join(","),
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
