const fs = require("fs");
const path = require("path");
const { centsToDollars, evaluatePortfolio } = require("./guard");
const portfolio = require("./fixtures/contracts.json");

const artifactsDir = path.join(__dirname, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const result = evaluatePortfolio(portfolio);

function writeJson() {
  fs.writeFileSync(path.join(artifactsDir, "demo-output.json"), `${JSON.stringify(result, null, 2)}\n`);
}

function writeMarkdown() {
  const lines = [
    "# Revenue Commitment True-Up Guard Report",
    "",
    `Generated: ${result.generatedAt}`,
    `Portfolio: ${result.portfolio}`,
    "",
    "## Summary",
    "",
    `- Contracts reviewed: ${result.summary.contracts}`,
    `- Invoices reviewed: ${result.summary.invoices}`,
    `- Release: ${result.summary.release}`,
    `- Review before release: ${result.summary.review}`,
    `- Hold invoice: ${result.summary.hold}`,
    `- Absolute true-up variance: ${centsToDollars(result.summary.totalVarianceCents)}`,
    "",
    "## Invoice Decisions",
    "",
    "| Contract | Invoice | Action | Expected true-up | Proposed true-up | Findings |",
    "| --- | --- | --- | ---: | ---: | --- |",
  ];

  for (const contract of result.evaluations) {
    for (const invoice of contract.invoices) {
      const findings = invoice.findings.map((finding) => finding.code).join(", ") || "none";
      lines.push(
        `| ${invoice.contractId} | ${invoice.invoiceId} | ${invoice.action} | ${centsToDollars(
          invoice.expectedTrueUpCents
        )} | ${centsToDollars(invoice.proposedTrueUpCents)} | ${findings} |`
      );
    }
  }

  lines.push(
    "",
    "## Reviewer Notes",
    "",
    "- All data is synthetic and credential-free.",
    "- `HOLD_INVOICE` means a finance or revenue-ops blocker should be resolved before release.",
    "- `REVIEW_BEFORE_RELEASE` means release is possible after a documented finance check."
  );

  fs.writeFileSync(path.join(artifactsDir, "reviewer-report.md"), `${lines.join("\n")}\n`);
}

function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function writeSvg() {
  const invoices = result.evaluations.flatMap((contract) => contract.invoices);
  const width = 920;
  const rowHeight = 62;
  const height = 110 + invoices.length * rowHeight;
  const maxRisk = Math.max(1, ...invoices.map((invoice) => invoice.riskScore));

  const rows = invoices
    .map((invoice, index) => {
      const y = 82 + index * rowHeight;
      const barWidth = Math.max(4, Math.round((invoice.riskScore / maxRisk) * 420));
      const color = invoice.action === "HOLD_INVOICE" ? "#b91c1c" : invoice.action === "REVIEW_BEFORE_RELEASE" ? "#ca8a04" : "#15803d";
      const label = `${invoice.invoiceId} ${invoice.action}`;
      return `
  <text x="28" y="${y + 20}" font-size="15" fill="#111827">${escapeXml(label)}</text>
  <rect x="360" y="${y}" width="${barWidth}" height="26" rx="4" fill="${color}" opacity="0.88" />
  <text x="${Math.min(800, 370 + barWidth)}" y="${y + 19}" font-size="13" fill="#111827">${invoice.riskScore}</text>
  <text x="28" y="${y + 42}" font-size="12" fill="#4b5563">${escapeXml(
        invoice.findings.map((finding) => finding.code).join(", ") || "clear"
      )}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f8fafc" />
  <text x="28" y="38" font-size="24" font-weight="700" fill="#0f172a">Revenue Commitment True-Up Risk Map</text>
  <text x="28" y="62" font-size="14" fill="#475569">Synthetic invoices scored before release</text>
${rows}
</svg>
`;

  fs.writeFileSync(path.join(artifactsDir, "trueup-risk-map.svg"), svg);
}

writeJson();
writeMarkdown();
writeSvg();

console.log(`Wrote reviewer artifacts to ${artifactsDir}`);
console.log(JSON.stringify(result.summary, null, 2));
