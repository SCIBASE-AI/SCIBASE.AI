"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const packets = require("../examples/citation-evidence-packets.json");
const { evaluateCitationEvidenceBatch, summarize } = require("../src");

const root = path.join(__dirname, "..");
const artifactDir = path.join(root, "artifacts");
fs.mkdirSync(artifactDir, { recursive: true });

const results = evaluateCitationEvidenceBatch(packets, { asOf: "2026-06-14", maxEvidenceAgeYears: 8 });
const summary = summarize(results);

fs.writeFileSync(
  path.join(artifactDir, "citation-evidence-results.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)
);

function reportMarkdown() {
  const lines = [
    "# Citation Retraction Evidence Guard Report",
    "",
    `Summary: blocks=${summary.blocks}, reviews=${summary.reviews}, passes=${summary.passes}`,
    ""
  ];
  for (const result of results) {
    lines.push(`## ${result.packetId}`, "");
    lines.push(`- Manuscript: ${result.manuscriptId}`);
    lines.push(`- Decision: ${result.decision}`, "");
    lines.push("| Severity | Code | Message | Remediation |");
    lines.push("| --- | --- | --- | --- |");
    for (const finding of result.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.message} | ${finding.remediation} |`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

fs.writeFileSync(path.join(artifactDir, "citation-evidence-report.md"), reportMarkdown());

function svg() {
  const rows = results.map((result, index) => {
    const y = 116 + index * 72;
    const color = result.decision === "BLOCK_ASSISTANT_OUTPUT" ? "#b91c1c" : result.decision === "HOLD_FOR_EDITOR" ? "#b45309" : "#15803d";
    return [
      `  <text x="40" y="${y + 23}" class="label">${result.packetId}</text>`,
      `  <rect x="560" y="${y}" width="300" height="36" rx="6" fill="${color}" />`,
      `  <text x="580" y="${y + 23}" class="decision">${result.decision}</text>`
    ].join("\n");
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="360" viewBox="0 0 920 360">
  <style>
    .title { font: 700 28px Arial, sans-serif; fill: #111827; }
    .meta { font: 16px Arial, sans-serif; fill: #475569; }
    .label { font: 15px Arial, sans-serif; fill: #111827; }
    .decision { font: 700 14px Arial, sans-serif; fill: #ffffff; }
  </style>
  <rect width="920" height="360" fill="#f8fafc"/>
  <text x="40" y="54" class="title">Citation Retraction Evidence Guard</text>
  <text x="40" y="86" class="meta">blocks=${summary.blocks} reviews=${summary.reviews} passes=${summary.passes}</text>
${rows}
</svg>
`;
}

fs.writeFileSync(path.join(artifactDir, "citation-evidence-summary.svg"), svg());

function writePpmFrame(file) {
  const width = 640;
  const height = 360;
  const pixels = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let color = [248, 250, 252];
      if (x > 70 && x < 570 && y > 80 && y < 128) color = [21, 128, 61];
      if (x > 70 && x < 570 && y > 156 && y < 204) color = [180, 83, 9];
      if (x > 70 && x < 570 && y > 232 && y < 280) color = [185, 28, 28];
      pixels.push(Buffer.from(color));
    }
  }
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), ...pixels]));
}

function renderVideo() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "citation-evidence-"));
  const frame = path.join(tempDir, "frame.ppm");
  const output = path.join(artifactDir, "citation-evidence-demo.mp4");
  writePpmFrame(frame);
  const result = spawnSync("ffmpeg", [
    "-y",
    "-loop", "1",
    "-i", frame,
    "-t", "4",
    "-vf", "scale=640:360,format=yuv420p",
    output
  ], { stdio: "ignore" });
  if (result.status !== 0) {
    fs.writeFileSync(path.join(artifactDir, "citation-evidence-demo.txt"), "ffmpeg unavailable; SVG summary is the visual demo artifact.\n");
  }
}

renderVideo();

console.log("Citation retraction evidence guard demo generated");
console.log(`- decisions: ${results.map((result) => `${result.packetId}:${result.decision}`).join(", ")}`);
console.log(`- summary: ${JSON.stringify(summary)}`);
