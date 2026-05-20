const fs = require("node:fs");
const path = require("node:path");
const { evaluateBadgeRenewals } = require("./index");
const { badgePolicy, researchers } = require("./sample-data");

const report = evaluateBadgeRenewals(badgePolicy, researchers);
const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(
  path.join(outputDir, "badge-renewal-review.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
fs.writeFileSync(path.join(outputDir, "badge-renewal-review.md"), toMarkdown(report));
fs.writeFileSync(path.join(outputDir, "badge-renewal-summary.svg"), toSvg(report));

console.log(`Wrote ${report.packets.length} badge renewal packets to ${outputDir}`);

function toMarkdown(report) {
  const lines = [
    "# Reputation Badge Renewal Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Renew: ${report.summary.renew}`,
    `- Review: ${report.summary.review}`,
    `- Downgrade: ${report.summary.downgrade}`,
    `- Expire: ${report.summary.expire}`,
    "",
    "## Badge Packets",
    "",
  ];

  for (const packet of report.packets) {
    lines.push(`### ${packet.displayName} - ${packet.badge}`);
    lines.push("");
    lines.push(`- Decision: ${packet.decision}`);
    lines.push(`- Score: ${packet.score}`);
    lines.push(`- Review count: ${packet.evidence.reviewCount}`);
    lines.push(`- Average review quality: ${packet.evidence.averageReviewQuality}`);
    lines.push(`- Reproducibility events: ${packet.evidence.reproducibilityCount}`);
    lines.push(`- Credit events: ${packet.evidence.creditCount}`);
    lines.push("");
    lines.push("Findings:");
    if (packet.findings.length === 0) {
      lines.push("- none");
    } else {
      for (const finding of packet.findings) {
        lines.push(`- ${finding.code}: ${finding.message}`);
      }
    }
    lines.push("");
    lines.push("Required actions:");
    for (const action of packet.requiredActions) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function toSvg(report) {
  const rows = report.packets
    .map((packet, index) => {
      const y = 130 + index * 64;
      const color = decisionColor(packet.decision);
      return `
  <g transform="translate(36 ${y})">
    <rect width="850" height="44" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
    <circle cx="23" cy="22" r="8" fill="${color}"/>
    <text x="46" y="19" font-size="15" font-weight="700" fill="#0f172a">${escapeXml(packet.displayName)} - ${escapeXml(packet.badge)}</text>
    <text x="46" y="36" font-size="12" fill="#475569">decision=${packet.decision} score=${packet.score} reviews=${packet.evidence.reviewCount} repro=${packet.evidence.reproducibilityCount}</text>
  </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="500" viewBox="0 0 920 500" role="img" aria-label="Badge renewal gate summary">
  <rect width="920" height="500" fill="#ffffff"/>
  <text x="36" y="48" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#0f172a">Reputation Badge Renewal Gate</text>
  <text x="36" y="76" font-family="Arial, sans-serif" font-size="14" fill="#475569">Community reputation badge renewal, review, downgrade, and expiry packets</text>
  <text x="36" y="104" font-family="Arial, sans-serif" font-size="14" fill="#334155">Renew ${report.summary.renew} · Review ${report.summary.review} · Downgrade ${report.summary.downgrade} · Expire ${report.summary.expire}</text>
  <g font-family="Arial, sans-serif">${rows}
  </g>
</svg>
`;
}

function decisionColor(decision) {
  if (decision === "renew") return "#0f766e";
  if (decision === "review") return "#b45309";
  if (decision === "downgrade") return "#7c3aed";
  return "#b91c1c";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
