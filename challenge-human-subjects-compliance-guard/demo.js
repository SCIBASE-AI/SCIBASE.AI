const fs = require("node:fs");
const path = require("node:path");
const { evaluateHumanSubjectsCompliance } = require("./index");
const { holdPacket, readyPacket, reviewPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const results = [holdPacket, reviewPacket, readyPacket].map(evaluateHumanSubjectsCompliance);
const primary = results[0];

fs.writeFileSync(
  path.join(reportsDir, "summary.json"),
  `${JSON.stringify({ generatedAt: "2026-05-22T00:00:00Z", results }, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportsDir, "reviewer-packet.md"), renderMarkdown(results));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(primary, results));

console.log(`Generated human-subjects compliance guard report for ${results.length} challenge submissions`);
console.log(`Primary status: ${primary.status}`);
console.log(`Primary blockers: ${primary.blockers.length}`);
console.log(`Digest: ${primary.auditDigest}`);

function renderMarkdown(results) {
  const lines = [
    "# Human Subjects Compliance Guard",
    "",
    "Issue: SCIBASE.AI #18 Scientific Bounty System",
    "Scope: compliance gate before sponsor review, award payout, or IP transfer for submissions using human-subject data.",
    "",
    "## Submission Decisions",
  ];

  for (const result of results) {
    lines.push(
      "",
      `### ${result.submissionId}`,
      `Challenge: ${result.challengeId}`,
      `Status: ${result.status.toUpperCase()}`,
      `Required decision: ${result.reviewerPacket.requiredDecision}`,
      `Audit digest: \`${result.auditDigest}\``,
      "",
      "Blockers:",
    );
    if (result.blockers.length === 0) {
      lines.push("- None.");
    } else {
      for (const blocker of result.blockers) {
        lines.push(`- ${blocker.code}: ${blocker.message}`);
      }
    }

    lines.push("", "Warnings:");
    if (result.warnings.length === 0) {
      lines.push("- None.");
    } else {
      for (const warning of result.warnings) {
        lines.push(`- ${warning.code}: ${warning.message}`);
      }
    }

    lines.push("", "Remediation actions:");
    for (const action of result.remediationActions) {
      lines.push(`- ${action}`);
    }
  }

  lines.push(
    "",
    "## Notes",
    "This demo uses synthetic data only. It makes no external calls and does not process real patient or participant records.",
  );

  return `${lines.join("\n")}\n`;
}

function renderSvg(primary, results) {
  const statusColor = primary.status === "ready" ? "#16a34a" : primary.status === "review" ? "#d97706" : "#dc2626";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#101827"/>
  <rect x="72" y="64" width="1136" height="592" rx="24" fill="#f8fafc"/>
  <text x="112" y="128" fill="#0f172a" font-family="Arial, sans-serif" font-size="42" font-weight="700">Human Subjects Compliance Guard</text>
  <text x="112" y="174" fill="#475569" font-family="Arial, sans-serif" font-size="22">SCIBASE Scientific Bounty System - issue #18</text>
  <rect x="112" y="226" width="220" height="86" rx="18" fill="${statusColor}"/>
  <text x="142" y="281" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">${primary.status.toUpperCase()}</text>
  <text x="112" y="374" fill="#0f172a" font-family="Arial, sans-serif" font-size="28">Primary blockers: ${primary.blockers.length}</text>
  <text x="112" y="420" fill="#0f172a" font-family="Arial, sans-serif" font-size="28">Submissions checked: ${results.length}</text>
  <text x="112" y="466" fill="#0f172a" font-family="Arial, sans-serif" font-size="28">Decision: ${escapeSvg(primary.reviewerPacket.requiredDecision)}</text>
  <text x="112" y="538" fill="#334155" font-family="Arial, sans-serif" font-size="20">Checks: IRB or exemption, consent scope, de-identification, DUA, reviewer training, payout/IP hold.</text>
  <text x="112" y="584" fill="#64748b" font-family="Arial, sans-serif" font-size="17">Digest: ${escapeSvg(primary.auditDigest)}</text>
  <text x="112" y="620" fill="#64748b" font-family="Arial, sans-serif" font-size="17">Synthetic data only. No external APIs. No private participant records.</text>
</svg>
`;
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
