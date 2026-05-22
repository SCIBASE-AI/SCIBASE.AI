"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  evaluateEmbargoRelease,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { safeWorkspace, unsafeWorkspace } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
const framesDir = path.join(reportsDir, "frames");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeReport(name, content) {
  fs.writeFileSync(path.join(reportsDir, name), content);
}

function writeFrame(index, title, packet) {
  const svg = frameSvg(title, packet);
  const svgPath = path.join(framesDir, `frame-${String(index).padStart(3, "0")}.svg`);
  const pngPath = path.join(framesDir, `frame-${String(index).padStart(3, "0")}.png`);
  fs.writeFileSync(svgPath, svg);
  execFileSync("convert", [svgPath, pngPath], { stdio: "ignore" });
}

function renderVideo() {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      "1",
      "-i",
      path.join(framesDir, "frame-%03d.png"),
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
      "-c:v",
      "libx264",
      "-t",
      "6",
      path.join(reportsDir, "demo.mp4"),
    ],
    { stdio: "ignore" },
  );
}

function frameSvg(title, packet) {
  const statusColor = packet.status === "block" ? "#c2410c" : "#a16207";
  const actions = packet.actions.slice(0, 3);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
    '<rect width="1280" height="720" fill="#0f172a"/>',
    '<rect x="74" y="70" width="1132" height="580" rx="28" fill="#f8fafc"/>',
    `<text x="122" y="150" font-family="Arial" font-size="44" font-weight="700" fill="${statusColor}">${escapeXml(title)}</text>`,
    `<text x="122" y="218" font-family="Arial" font-size="30" fill="#111827">Status: ${escapeXml(packet.status.toUpperCase())}</text>`,
    `<text x="122" y="268" font-family="Arial" font-size="26" fill="#334155">Blockers: ${packet.summary.blockers}   Warnings: ${packet.summary.warnings}   Fingerprint: ${escapeXml(packet.fingerprint.slice(0, 12))}</text>`,
    '<line x1="122" y1="314" x2="1158" y2="314" stroke="#cbd5e1" stroke-width="3"/>',
    ...actions.map((action, index) => (
      `<text x="122" y="${370 + index * 52}" font-family="Arial" font-size="25" fill="#1f2937">${escapeXml(action.priority)} - ${escapeXml(action.ownerRole)}</text>`
    )),
    '<text x="122" y="590" font-family="Arial" font-size="24" fill="#475569">Local-only demo generated from synthetic collaboration data.</text>',
    "</svg>",
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function main() {
  ensureDir(reportsDir);
  ensureDir(framesDir);

  const unsafePacket = evaluateEmbargoRelease(unsafeWorkspace);
  const safePacket = evaluateEmbargoRelease(safeWorkspace);

  writeReport("unsafe-packet.json", `${JSON.stringify(unsafePacket, null, 2)}\n`);
  writeReport("safe-packet.json", `${JSON.stringify(safePacket, null, 2)}\n`);
  writeReport("embargo-release-report.md", renderMarkdownReport(unsafePacket));
  writeReport("summary.svg", renderSvgSummary(unsafePacket));

  writeFrame(1, "1. Detect active embargo blockers", unsafePacket);
  writeFrame(2, "2. Redact restricted artifacts", safePacket);
  writeFrame(3, "3. Produce reviewer release packet", safePacket);
  renderVideo();

  console.log(`unsafe status=${unsafePacket.status} blockers=${unsafePacket.summary.blockers}`);
  console.log(`safe status=${safePacket.status} blockers=${safePacket.summary.blockers}`);
  console.log(`report=${path.join(reportsDir, "embargo-release-report.md")}`);
  console.log(`demo=${path.join(reportsDir, "demo.mp4")}`);
}

main();
