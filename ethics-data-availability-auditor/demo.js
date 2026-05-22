const fs = require("node:fs");
const path = require("node:path");
const { auditSubmissionPacket } = require("./index");
const { samplePacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const audit = auditSubmissionPacket(samplePacket);
fs.writeFileSync(
  path.join(reportsDir, "summary.json"),
  `${JSON.stringify(audit, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportsDir, "reviewer-packet.md"), renderMarkdown(audit));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(audit));

console.log(`Generated ethics/data availability audit for ${audit.manuscriptId}`);
console.log(`Status: ${audit.status}`);
console.log(`Blockers: ${audit.blockers.length}`);
console.log(`Digest: ${audit.auditDigest}`);

function renderMarkdown(audit) {
  const lines = [
    `# Ethics and Data Availability Review Packet`,
    ``,
    `Manuscript: ${audit.title} (${audit.manuscriptId})`,
    `Status: ${audit.status.toUpperCase()}`,
    `Audit digest: \`${audit.auditDigest}\``,
    ``,
    `## Blockers`,
  ];

  if (audit.blockers.length === 0) {
    lines.push("- None.");
  } else {
    for (const blocker of audit.blockers) {
      lines.push(`- ${blocker.code}: ${blocker.message}`);
    }
  }

  lines.push(``, `## Ready Signals`);
  for (const signal of audit.readySignals) {
    lines.push(`- ${signal}`);
  }

  lines.push(``, `## Reviewer Tasks`);
  for (const task of audit.reviewerTasks) {
    lines.push(`- ${task}`);
  }

  lines.push(
    ``,
    `## Scope`,
    `This packet is a deterministic peer-review compliance slice for issue #13. It does not call external APIs or process real participant data.`,
  );

  return `${lines.join("\n")}\n`;
}

function renderSvg(audit) {
  const statusColor = audit.status === "ready" ? "#22c55e" : audit.status === "revise" ? "#f59e0b" : "#ef4444";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="420" viewBox="0 0 920 420">
  <rect width="920" height="420" rx="20" fill="#0f172a"/>
  <text x="48" y="70" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="30" font-weight="700">Ethics/Data Availability Audit</text>
  <text x="48" y="112" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">${escapeSvg(audit.title)}</text>
  <rect x="48" y="150" width="170" height="58" rx="14" fill="${statusColor}"/>
  <text x="72" y="187" fill="#111827" font-family="Arial, sans-serif" font-size="24" font-weight="700">${audit.status.toUpperCase()}</text>
  <text x="48" y="258" fill="#f8fafc" font-family="Arial, sans-serif" font-size="22">Blockers: ${audit.blockers.length}</text>
  <text x="48" y="298" fill="#f8fafc" font-family="Arial, sans-serif" font-size="22">Ready signals: ${audit.readySignals.length}</text>
  <text x="48" y="338" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="15">Digest: ${escapeSvg(audit.auditDigest)}</text>
  <text x="48" y="372" fill="#94a3b8" font-family="Arial, sans-serif" font-size="14">Synthetic data only. No external calls.</text>
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
