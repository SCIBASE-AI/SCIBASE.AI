"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeDuplicateSolverRisk } = require("./duplicateSolverGuard");
const { sampleChallenge } = require("./sampleChallenge");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = analyzeDuplicateSolverRisk(sampleChallenge);
fs.writeFileSync(
  path.join(reportsDir, "duplicate-solver-packet.json"),
  JSON.stringify(packet, null, 2) + "\n",
);

const report = [
  "# Scientific Bounty Duplicate Solver Guard",
  "",
  `Status: **${packet.status}**`,
  "",
  "## Summary",
  "",
  `- Submissions checked: ${packet.summary.submissions}`,
  `- Blockers: ${packet.summary.blockers}`,
  `- Review items: ${packet.summary.reviewItems}`,
  `- Eligible for scoring: ${packet.summary.eligible}`,
  "",
  "## Blockers",
  "",
  ...packet.blocked.map((item) => `- ${item.code}: ${item.message}`),
  "",
  "## Manual Review",
  "",
  ...packet.review.map((item) => `- ${item.code}: ${item.message}`),
  "",
  "## Scope",
  "",
  "This guard supports SCIBASE scientific bounty arbitration by detecting repeated solver identities, repeated teams, shared payment routes, copied artifact hashes, and unusually similar submission summaries before sponsor scoring or payout routing.",
  "",
].join("\n");

fs.writeFileSync(path.join(reportsDir, "duplicate-solver-report.md"), report);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#101820"/>
  <text x="56" y="80" fill="#ffffff" font-family="Arial" font-size="34" font-weight="700">Scientific bounty duplicate solver guard</text>
  <text x="56" y="132" fill="#f5c542" font-family="Arial" font-size="24">Status: ${packet.status.toUpperCase()}</text>
  <rect x="56" y="178" width="250" height="120" rx="8" fill="#203040"/>
  <text x="86" y="230" fill="#ffffff" font-family="Arial" font-size="44">${packet.summary.submissions}</text>
  <text x="86" y="268" fill="#aab7c4" font-family="Arial" font-size="20">submissions checked</text>
  <rect x="356" y="178" width="250" height="120" rx="8" fill="#3a1f27"/>
  <text x="386" y="230" fill="#ffffff" font-family="Arial" font-size="44">${packet.summary.blockers}</text>
  <text x="386" y="268" fill="#f0b7c0" font-family="Arial" font-size="20">blocking findings</text>
  <rect x="656" y="178" width="250" height="120" rx="8" fill="#332d17"/>
  <text x="686" y="230" fill="#ffffff" font-family="Arial" font-size="44">${packet.summary.reviewItems}</text>
  <text x="686" y="268" fill="#f2dc92" font-family="Arial" font-size="20">manual review items</text>
  <text x="56" y="370" fill="#d7e0ea" font-family="Arial" font-size="22">Detects repeated solvers, teams, payment routes, copied artifacts, and summary similarity before scoring.</text>
</svg>
`;
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);

console.log(report);
