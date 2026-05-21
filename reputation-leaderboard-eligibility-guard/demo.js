"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildLeaderboardEligibilityPacket,
  buildMarkdownReport,
  buildSvgSummary,
} = require("./index");
const { leaderboard } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = buildLeaderboardEligibilityPacket(leaderboard);
const markdown = buildMarkdownReport(packet);
const svg = buildSvgSummary(packet);

fs.writeFileSync(path.join(reportsDir, "leaderboard-eligibility-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "leaderboard-eligibility-report.md"), markdown);
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);

console.log(`status=${packet.status}`);
console.log(`eligible=${packet.publishableRanks.length}`);
console.log(`held=${packet.heldCandidates.length}`);
console.log(`blockers=${packet.blockers.length}`);
console.log(`auditDigest=${packet.auditDigest}`);
console.log(`reports=${reportsDir}`);
