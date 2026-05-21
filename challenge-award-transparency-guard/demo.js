"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildAwardTransparencyPacket,
  buildMarkdownReport,
  buildSvgSummary,
} = require("./index");
const { challenge } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = buildAwardTransparencyPacket(challenge);
const markdown = buildMarkdownReport(packet);
const svg = buildSvgSummary(packet);

fs.writeFileSync(path.join(reportsDir, "award-transparency-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "award-transparency-report.md"), markdown);
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);

console.log(`status=${packet.status}`);
console.log(`blockers=${packet.blockers.length}`);
console.log(`warnings=${packet.warnings.length}`);
console.log(`auditDigest=${packet.auditDigest}`);
console.log(`reports=${reportsDir}`);
