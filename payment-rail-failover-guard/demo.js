"use strict";

const fs = require("fs");
const path = require("path");
const { evaluatePaymentRailFailoverReadiness } = require("./index");
const sample = require("./sample-data");

const outputDir = __dirname;
const report = evaluatePaymentRailFailoverReadiness({
  ...sample,
  generatedAt: "2026-05-20T12:00:00Z",
});

function writeJson(fileName, value) {
  fs.writeFileSync(
    path.join(outputDir, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildFinancePacket(reportValue) {
  const rows = reportValue.decisions
    .map((decision) => {
      const findingCodes = decision.findings.map((item) => item.code).join(", ");
      return `| ${decision.invoiceId} | ${decision.decision} | ${
        decision.selectedRail || "none"
      } | ${decision.fallbackUsed ? "yes" : "no"} | ${findingCodes || "none"} |`;
    })
    .join("\n");

  return `# Payment Rail Failover Review Packet

Audit digest: \`${reportValue.auditDigest}\`

## Summary

- Total invoices reviewed: ${reportValue.summary.total}
- Fallback releases: ${reportValue.summary.fallbackReleases}
- Findings raised: ${reportValue.summary.findings}
- Release with fallback: ${reportValue.summary.byDecision.release_with_fallback || 0}
- Hold for review: ${reportValue.summary.byDecision.hold_for_review || 0}
- Block: ${reportValue.summary.byDecision.block || 0}

## Invoice Decisions

| Invoice | Decision | Selected rail | Fallback | Findings |
| --- | --- | --- | --- | --- |
${rows}

## Reviewer Notes

This packet uses synthetic data only. It demonstrates the control boundary between
subscription billing, AI compute top-ups, analytics licensing, and payment rail
operations during a processor outage or rail restriction.
`;
}

function buildSvg(reportValue) {
  const decisions = Object.entries(reportValue.summary.byDecision);
  const colors = {
    release: "#147a42",
    release_with_fallback: "#2463eb",
    hold_for_review: "#b25b00",
    block: "#b42318",
  };

  const bars = decisions
    .map(([decision, count], index) => {
      const y = 205 + index * 70;
      const width = 120 + count * 70;
      return `
  <text x="70" y="${y}" class="label">${escapeXml(decision)}</text>
  <rect x="300" y="${y - 24}" width="${width}" height="34" rx="4" fill="${
        colors[decision] || "#475467"
      }" />
  <text x="${320 + width}" y="${y}" class="count">${count}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="42" width="1184" height="636" rx="8" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="70" y="110" class="title">Payment Rail Failover Guard</text>
  <text x="70" y="150" class="subtitle">Revenue infrastructure release decisions during payment rail disruption</text>
${bars}
  <text x="70" y="610" class="footer">Audit digest: ${escapeXml(
    reportValue.auditDigest
  )}</text>
  <style>
    .title { font: 700 42px Arial, sans-serif; fill: #101828; }
    .subtitle { font: 24px Arial, sans-serif; fill: #475467; }
    .label { font: 22px Arial, sans-serif; fill: #344054; }
    .count { font: 700 24px Arial, sans-serif; fill: #101828; }
    .footer { font: 20px Menlo, Consolas, monospace; fill: #475467; }
  </style>
</svg>
`;
}

writeJson("rail-failover-report.json", report);
fs.writeFileSync(
  path.join(outputDir, "finance-review-packet.md"),
  buildFinancePacket(report),
  "utf8"
);
fs.writeFileSync(path.join(outputDir, "demo.svg"), buildSvg(report), "utf8");

console.log("Wrote payment rail failover report artifacts");
console.log(`Audit digest: ${report.auditDigest}`);
