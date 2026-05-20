const fs = require("node:fs");
const path = require("node:path");
const { buildRevenueForecastReport } = require("./index");
const sample = require("./sample-data");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeSvg(report, outPath) {
  const rows = [
    ["Status", report.status],
    ["Forecast revenue", `$${report.forecastRevenue.toLocaleString("en-US")}`],
    ["Current revenue", `$${report.currentRevenue.toLocaleString("en-US")}`],
    ["Variance", `${report.variancePct}% ($${report.variance.toLocaleString("en-US")})`],
    ["Critical findings", report.criticalCount],
    ["High findings", report.highCount],
    ["Audit digest", report.auditDigest],
  ];

  const findingLines = report.actions.slice(0, 5).map((action) => `${action.severity.toUpperCase()} ${action.owner}: ${action.code}`);
  const rowSvg = rows
    .map((row, index) => {
      const y = 140 + index * 45;
      return `<text x="80" y="${y}" class="label">${escapeXml(row[0])}</text><text x="360" y="${y}" class="value">${escapeXml(row[1])}</text>`;
    })
    .join("\n");
  const findingSvg = findingLines
    .map((line, index) => `<text x="80" y="${505 + index * 34}" class="finding">${escapeXml(line)}</text>`)
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="44" y="44" width="1192" height="632" rx="18" fill="#f8fafc"/>
  <text x="80" y="100" class="title">SCIBASE Revenue Forecast Variance Guard</text>
  ${rowSvg}
  <text x="80" y="465" class="section">Top finance actions</text>
  ${findingSvg}
  <style>
    .title { font: 700 40px Arial, sans-serif; fill: #111827; }
    .section { font: 700 27px Arial, sans-serif; fill: #111827; }
    .label { font: 700 25px Arial, sans-serif; fill: #334155; }
    .value { font: 500 25px Arial, sans-serif; fill: #0f172a; }
    .finding { font: 500 22px Arial, sans-serif; fill: #7f1d1d; }
  </style>
</svg>`;

  fs.writeFileSync(outPath, svg);
}

const report = buildRevenueForecastReport(sample);
const docsDir = path.join(__dirname, "docs");
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, "demo-output.json"), `${JSON.stringify(report, null, 2)}\n`);
writeSvg(report, path.join(docsDir, "demo.svg"));

console.log(`Status: ${report.status}`);
console.log(`Forecast revenue: $${report.forecastRevenue.toLocaleString("en-US")}`);
console.log(`Current revenue: $${report.currentRevenue.toLocaleString("en-US")}`);
console.log(`Variance: ${report.variancePct}% ($${report.variance.toLocaleString("en-US")})`);
console.log(`Critical findings: ${report.criticalCount}`);
console.log(`High findings: ${report.highCount}`);
console.log(`Top action: ${report.actions[0].code} for ${report.actions[0].owner}`);
console.log(`Audit digest: ${report.auditDigest}`);
console.log("Wrote docs/demo.svg and docs/demo-output.json");
