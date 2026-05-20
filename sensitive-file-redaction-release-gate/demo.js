"use strict";

const fs = require("fs");
const path = require("path");
const { createReviewPacket } = require("./index");
const { samplePacket } = require("./sample-data");

function reportsDir() {
  const dir = path.join(__dirname, "reports");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function markdown(packet) {
  return [
    "# Sensitive File Redaction Release Gate",
    "",
    `Context: ${packet.context}`,
    `Status: ${packet.status}`,
    "",
    "## Held Items",
    ...(packet.evaluations.filter((item) => item.status === "held").map((item) => `- ${item.itemId}: ${item.holdLabels.join(", ")}`)),
    "",
    "## Reviewer Actions",
    ...packet.reviewerActions.map((action) => `- ${action.itemId}: ${action.action}`),
    "",
  ].join("\n");
}

function svg(packet) {
  const rows = packet.evaluations.map((item, index) => {
    const y = 150 + index * 52;
    const color = item.status === "ready" ? "#247c7a" : "#b33f62";
    return `
      <text x="48" y="${y}" font-size="16" fill="#17324d">${item.itemId}</text>
      <text x="160" y="${y}" font-size="15" fill="#17324d">${item.name}</text>
      <rect x="520" y="${y - 20}" width="150" height="27" rx="6" fill="${color}"/>
      <text x="538" y="${y}" font-size="14" fill="#fff">${item.status}</text>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="430" viewBox="0 0 720 430">
    <rect width="720" height="430" fill="#f8fbfa"/>
    <rect x="24" y="24" width="672" height="382" rx="14" fill="#fff" stroke="#c7d9d6"/>
    <text x="48" y="72" font-size="25" font-family="Arial, sans-serif" font-weight="700" fill="#17324d">Sensitive File Redaction Release Gate</text>
    <text x="48" y="104" font-size="16" font-family="Arial, sans-serif" fill="#496272">Status: ${packet.status}; held: ${packet.heldItems.length}; ready: ${packet.readyItems.length}</text>
    <g font-family="Arial, sans-serif">${rows}</g>
  </svg>`;
}

function runDemo() {
  const packet = createReviewPacket(samplePacket);
  const dir = reportsDir();
  fs.writeFileSync(path.join(dir, "review-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "review-packet.md"), `${markdown(packet)}\n`);
  fs.writeFileSync(path.join(dir, "summary.svg"), svg(packet));
  return packet;
}

if (require.main === module) {
  const packet = runDemo();
  console.log(JSON.stringify({ status: packet.status, held: packet.heldItems.length, ready: packet.readyItems.length }, null, 2));
}

module.exports = { runDemo, markdown, svg };
