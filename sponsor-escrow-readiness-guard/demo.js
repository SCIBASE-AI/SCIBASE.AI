const fs = require("node:fs");
const path = require("node:path");
const { cleanPacket, riskyPacket } = require("./sample-data");
const { evaluateSponsorEscrowPacket } = require("./index");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const clean = evaluateSponsorEscrowPacket(cleanPacket);
const risky = evaluateSponsorEscrowPacket(riskyPacket);
const report = {
  generatedAt: new Date("2026-06-02T00:00:00Z").toISOString(),
  module: "sponsor-escrow-readiness-guard",
  clean,
  risky
};

function findingsMarkdown(result) {
  return result.challengeResults.map((challenge) => {
    const findings = challenge.findings.length === 0
      ? "- No findings."
      : challenge.findings.map((item) => `- ${item.severity.toUpperCase()} ${item.code}: ${item.message} ${item.remediation}`).join("\n");
    return `### ${challenge.challengeId}\n\nDecision: ${challenge.decision}\n\n${findings}`;
  }).join("\n\n");
}

const markdown = `# Sponsor Escrow Readiness Report

Generated: ${report.generatedAt}

## Clean Packet

Decision: ${clean.decision}

${findingsMarkdown(clean)}

## Risky Packet

Decision: ${risky.decision}

${findingsMarkdown(risky)}
`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="520" viewBox="0 0 920 520">
  <rect width="920" height="520" fill="#0f172a"/>
  <rect x="60" y="56" width="800" height="408" rx="14" fill="#f8fafc"/>
  <text x="104" y="128" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0f172a">Sponsor Escrow Readiness Guard</text>
  <text x="104" y="190" font-family="Arial, sans-serif" font-size="24" fill="#334155">Release: ${clean.releaseCount} challenge</text>
  <rect x="104" y="220" width="260" height="52" fill="#16a34a"/>
  <text x="386" y="256" font-family="Arial, sans-serif" font-size="20" fill="#0f172a">Clean escrow and payout schedule</text>
  <text x="104" y="330" font-family="Arial, sans-serif" font-size="24" fill="#334155">Hold: ${risky.holdCount} challenges</text>
  <rect x="104" y="360" width="520" height="52" fill="#dc2626"/>
  <text x="646" y="396" font-family="Arial, sans-serif" font-size="20" fill="#0f172a">${risky.blockerCount} blockers, ${risky.revisionCount} revisions</text>
</svg>`;

fs.writeFileSync(path.join(reportsDir, "escrow-readiness-report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportsDir, "escrow-readiness-report.md"), markdown);
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);

console.log(`wrote ${path.join(reportsDir, "escrow-readiness-report.json")}`);
console.log(`wrote ${path.join(reportsDir, "escrow-readiness-report.md")}`);
console.log(`wrote ${path.join(reportsDir, "summary.svg")}`);
