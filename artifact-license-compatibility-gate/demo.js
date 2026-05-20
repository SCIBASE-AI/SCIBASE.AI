"use strict";

const fs = require("fs");
const path = require("path");
const { createLicenseCompatibilityPacket } = require("./index");
const { releaseManifest } = require("./sample-data");

function reportsDir() {
  const dir = path.join(__dirname, "reports");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function markdown(packet) {
  return [
    "# Artifact License Compatibility Packet",
    "",
    `Release: ${packet.releaseId}`,
    `Intent: ${packet.releaseIntent}`,
    `Target license: ${packet.targetLicense}`,
    `Status: ${packet.releaseStatus}`,
    "",
    "## Blocked Artifacts",
    ...packet.evaluations
      .filter((artifact) => artifact.status === "blocked")
      .map((artifact) => `- ${artifact.artifactId} (${artifact.license}): ${artifact.holds.join(", ")}`),
    "",
  ].join("\n");
}

function svg(packet) {
  const rows = packet.evaluations.map((artifact, index) => {
    const y = 150 + index * 48;
    const color = artifact.status === "release-ready" ? "#247c7a" : "#b33f62";
    return `
      <text x="48" y="${y}" font-size="16" fill="#17324d">${artifact.artifactId}</text>
      <text x="160" y="${y}" font-size="16" fill="#17324d">${artifact.license}</text>
      <text x="290" y="${y}" font-size="15" fill="#496272">${artifact.type}</text>
      <rect x="500" y="${y - 20}" width="170" height="27" rx="6" fill="${color}"/>
      <text x="518" y="${y}" font-size="14" fill="#fff">${artifact.status}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="430" viewBox="0 0 720 430">
    <rect width="720" height="430" fill="#f8fbfa"/>
    <rect x="24" y="24" width="672" height="382" rx="14" fill="#fff" stroke="#c7d9d6"/>
    <text x="48" y="72" font-size="27" font-family="Arial, sans-serif" font-weight="700" fill="#17324d">Artifact license compatibility</text>
    <text x="48" y="104" font-size="16" font-family="Arial, sans-serif" fill="#496272">Release status: ${packet.releaseStatus}; blocked: ${packet.blockedArtifacts.length}</text>
    <g font-family="Arial, sans-serif">${rows}</g>
  </svg>`;
}

function runDemo() {
  const packet = createLicenseCompatibilityPacket(releaseManifest);
  const dir = reportsDir();
  fs.writeFileSync(path.join(dir, "license-compatibility-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "license-compatibility-packet.md"), `${markdown(packet)}\n`);
  fs.writeFileSync(path.join(dir, "license-summary.svg"), svg(packet));
  return packet;
}

if (require.main === module) {
  const packet = runDemo();
  console.log(JSON.stringify({
    status: packet.releaseStatus,
    ready: packet.readyArtifacts.length,
    blocked: packet.blockedArtifacts.length,
  }, null, 2));
}

module.exports = { runDemo, markdown, svg };
