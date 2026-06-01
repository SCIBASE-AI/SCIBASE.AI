"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateDebriefPacket,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, revisionPacket, holdPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
const fixedNow = "2026-06-01T09:00:00.000Z";

const evaluations = [cleanPacket, revisionPacket, holdPacket].map((packet) =>
  evaluateDebriefPacket(packet, { now: fixedNow })
);

const aggregate = {
  packetId: "synthetic-debrief-release-suite",
  challengeId: "SCI-BOUNTY-018-SYNTH",
  generatedAt: fixedNow,
  packetDigest: evaluations.map((result) => result.packetDigest.slice(0, 12)).join("-"),
  decision: worstDecision(evaluations.map((result) => result.decision)),
  releaseAllowed: false,
  severityCounts: aggregateCounts(evaluations),
  findings: evaluations.flatMap((result) => result.findings),
  coverage: {
    rubricCount: evaluations[0].coverage.rubricCount,
    debriefCount: evaluations.reduce((sum, result) => sum + result.coverage.debriefCount, 0),
    teamCount: evaluations[0].coverage.teamCount,
    perDebrief: evaluations.flatMap((result) =>
      result.coverage.perDebrief.map((entry) => ({
        ...entry,
        teamId: `${result.packetId}:${entry.teamId}`
      }))
    )
  }
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(
  path.join(reportsDir, "debrief-release-packet.json"),
  `${JSON.stringify({ generatedAt: fixedNow, evaluations }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "debrief-release-report.md"),
  evaluations.map((result) => renderMarkdownReport(result)).join("\n---\n\n")
);
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvgSummary(aggregate));

console.log(`Wrote ${evaluations.length} debrief evaluations to ${reportsDir}`);
console.log(`Aggregate decision: ${aggregate.decision}`);

function aggregateCounts(results) {
  const counts = { critical: 0, high: 0, warning: 0, info: 0 };
  results.forEach((result) => {
    Object.entries(result.severityCounts).forEach(([severity, count]) => {
      counts[severity] = (counts[severity] ?? 0) + count;
    });
  });
  return counts;
}

function worstDecision(decisions) {
  if (decisions.includes("hold_debrief_release")) return "hold_debrief_release";
  if (decisions.includes("revise_before_release")) return "revise_before_release";
  if (decisions.includes("release_with_monitoring")) return "release_with_monitoring";
  return "release_debrief";
}
