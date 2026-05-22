const fs = require("node:fs");
const path = require("node:path");
const { evaluatePreregistrationDeviation } = require("./index");
const { holdPacket, readyPacket, reviewPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const results = [holdPacket, reviewPacket, readyPacket].map(evaluatePreregistrationDeviation);
const primary = results[0];

fs.writeFileSync(
  path.join(reportsDir, "summary.json"),
  `${JSON.stringify({ generatedAt: "2026-05-22T00:00:00Z", issue: "SCIBASE.AI #16", results }, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportsDir, "reviewer-packet.md"), renderMarkdown(results));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(primary, results));

console.log(`Generated preregistration deviation report for ${results.length} manuscripts`);
console.log(`Primary status: ${primary.status}`);
console.log(`Primary blockers: ${primary.blockers.length}`);
console.log(`Digest: ${primary.auditDigest}`);

function renderMarkdown(results) {
  const lines = [
    "# Preregistration Deviation Assistant",
    "",
    "Issue: SCIBASE.AI #16 AI-Powered Research Assistant Suite",
    "Scope: compare manuscript claims against a preregistration or registered report before AI peer review presents findings as confirmatory.",
    "",
    "## Manuscript Decisions",
  ];

  for (const result of results) {
    lines.push(
      "",
      `### ${result.manuscriptId}`,
      `Registration: ${result.registrationId}`,
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
    if (result.remediationActions.length === 0) {
      lines.push("- None.");
    } else {
      for (const action of result.remediationActions) {
        lines.push(`- ${action}`);
      }
    }
  }

  lines.push(
    "",
    "## Notes",
    "This demo uses synthetic data only. It performs no model calls, registry lookups, or external network requests.",
  );

  return `${lines.join("\n")}\n`;
}

function renderSvg(primary, results) {
  const statusColor = primary.status === "ready" ? "#16a34a" : primary.status === "review" ? "#d97706" : "#dc2626";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="72" y="64" width="1136" height="592" rx="24" fill="#f9fafb"/>
  <text x="112" y="128" fill="#111827" font-family="Arial, sans-serif" font-size="42" font-weight="700">Preregistration Deviation Assistant</text>
  <text x="112" y="174" fill="#4b5563" font-family="Arial, sans-serif" font-size="22">SCIBASE AI-Powered Research Assistant Suite - issue #16</text>
  <rect x="112" y="226" width="220" height="86" rx="18" fill="${statusColor}"/>
  <text x="142" y="281" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">${primary.status.toUpperCase()}</text>
  <text x="112" y="374" fill="#111827" font-family="Arial, sans-serif" font-size="28">Primary blockers: ${primary.blockers.length}</text>
  <text x="112" y="420" fill="#111827" font-family="Arial, sans-serif" font-size="28">Manuscripts checked: ${results.length}</text>
  <text x="112" y="466" fill="#111827" font-family="Arial, sans-serif" font-size="28">Decision: ${escapeSvg(primary.reviewerPacket.requiredDecision)}</text>
  <text x="112" y="538" fill="#374151" font-family="Arial, sans-serif" font-size="20">Checks: primary outcomes, hierarchy, model, covariates, sample size, exclusions, subgroups, timing.</text>
  <text x="112" y="584" fill="#6b7280" font-family="Arial, sans-serif" font-size="17">Digest: ${escapeSvg(primary.auditDigest)}</text>
  <text x="112" y="620" fill="#6b7280" font-family="Arial, sans-serif" font-size="17">Synthetic data only. No model calls. No registry network access.</text>
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
