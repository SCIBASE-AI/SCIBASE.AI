"use strict";

const fs = require("fs");
const path = require("path");
const { createReviewerPacket } = require("./index");
const { grantPacket } = require("./sample-data");

function ensureReportsDir() {
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function renderMarkdown(packet) {
  const lines = [
    `# Grant-Fit Reviewer Packet`,
    "",
    `Project: ${packet.projectTitle}`,
    `Funder: ${packet.funder}`,
    `Status: ${packet.status}`,
    `Weighted score: ${packet.weightedScore}`,
    "",
    "## Reviewer Summary",
    ...packet.reviewerSummary.map((item) => `- ${item}`),
    "",
    "## Action Items",
    ...packet.actionItems.map((item) => `- ${item}`),
    "",
    "## Section Scores",
    `- Priority coverage: ${packet.sections.priority.score.toFixed(2)}`,
    `- Open artifact readiness: ${packet.sections.artifacts.score.toFixed(2)}`,
    `- Budget fit: ${packet.sections.budget.score.toFixed(2)}`,
    `- Ethics readiness: ${packet.sections.ethics.score.toFixed(2)}`,
    `- Evidence grounding: ${packet.sections.evidence.score.toFixed(2)}`,
    `- Impact clarity: ${packet.sections.impact.score.toFixed(2)}`,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const score = Math.round(packet.weightedScore * 100);
  const bars = [
    ["Priority", packet.sections.priority.score],
    ["Artifacts", packet.sections.artifacts.score],
    ["Budget", packet.sections.budget.score],
    ["Ethics", packet.sections.ethics.score],
    ["Evidence", packet.sections.evidence.score],
    ["Impact", packet.sections.impact.score],
  ];

  const barRows = bars.map(([label, value], index) => {
    const y = 155 + index * 52;
    const width = Math.round(value * 420);
    return `
      <text x="44" y="${y + 20}" font-size="18" fill="#17324d">${label}</text>
      <rect x="170" y="${y}" width="420" height="24" rx="5" fill="#dbe7ee"/>
      <rect x="170" y="${y}" width="${width}" height="24" rx="5" fill="#247c7a"/>
      <text x="610" y="${y + 20}" font-size="16" fill="#17324d">${Math.round(value * 100)}%</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="540" viewBox="0 0 760 540">
    <rect width="760" height="540" fill="#f6faf9"/>
    <rect x="24" y="24" width="712" height="492" rx="14" fill="#ffffff" stroke="#c8d8d5"/>
    <text x="44" y="72" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#17324d">Grant-fit funder alignment</text>
    <text x="44" y="104" font-size="18" font-family="Arial, sans-serif" fill="#496272">${packet.status} for ${packet.funder}</text>
    <circle cx="650" cy="84" r="42" fill="#247c7a"/>
    <text x="628" y="95" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">${score}</text>
    <g font-family="Arial, sans-serif">${barRows}</g>
    <text x="44" y="494" font-size="16" font-family="Arial, sans-serif" fill="#496272">Top action: ${packet.actionItems[0]}</text>
  </svg>`;
}

function runDemo() {
  const reviewerPacket = createReviewerPacket(grantPacket);
  const reportsDir = ensureReportsDir();

  fs.writeFileSync(
    path.join(reportsDir, "grant-fit-reviewer-packet.json"),
    `${JSON.stringify(reviewerPacket, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(reportsDir, "grant-fit-reviewer-packet.md"), renderMarkdown(reviewerPacket));
  fs.writeFileSync(path.join(reportsDir, "grant-fit-summary.svg"), renderSvg(reviewerPacket));

  return reviewerPacket;
}

if (require.main === module) {
  const packet = runDemo();
  console.log(JSON.stringify({
    status: packet.status,
    weightedScore: packet.weightedScore,
    actionItems: packet.actionItems.length,
  }, null, 2));
}

module.exports = { runDemo, renderMarkdown, renderSvg };
