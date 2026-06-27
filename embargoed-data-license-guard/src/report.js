import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { summarizeResults } from "./licenseGuard.js";

export function writeArtifacts(results, outputDir = "artifacts") {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, "demo-output.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  writeFileSync(join(outputDir, "demo-report.md"), markdownReport(results));
  writeFileSync(join(outputDir, "release-summary.svg"), svgSummary(results));
}

export function markdownReport(results) {
  const rows = results
    .map(
      (result) =>
        `| ${result.licenseId} | ${result.customer} | ${result.exportType} | ${result.decision} | ${result.financeAction} |`,
    )
    .join("\n");
  const details = results
    .map((result) => {
      const findings = result.findings.length
        ? result.findings
            .map((finding) => `  - ${finding.severity}: ${finding.code} - ${finding.message}`)
            .join("\n")
        : "  - RELEASE: no blocking findings";
      return `### ${result.licenseId}\n\n${findings}`;
    })
    .join("\n\n");

  return `# Embargoed Data License Guard Demo

| License | Customer | Export | Decision | Finance action |
| --- | --- | --- | --- | --- |
${rows}

${details}
`;
}

export function svgSummary(results) {
  const summary = summarizeResults(results);
  const bars = [
    { label: "Release", value: summary.release, color: "#15803d" },
    { label: "Review", value: summary.review, color: "#ca8a04" },
    { label: "Hold", value: summary.hold, color: "#b91c1c" },
  ];
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  const barMarkup = bars
    .map((bar, index) => {
      const y = 56 + index * 48;
      const width = 240 * (bar.value / max);
      return `<text x="24" y="${y + 17}" font-size="14">${bar.label}</text><rect x="100" y="${y}" width="${width}" height="24" fill="${bar.color}" rx="4"/><text x="${110 + width}" y="${y + 17}" font-size="14">${bar.value}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220" viewBox="0 0 420 220">
  <rect width="420" height="220" fill="#f8fafc"/>
  <text x="24" y="32" font-size="18" font-weight="700">Embargoed data license decisions</text>
  ${barMarkup}
  <text x="24" y="204" font-size="12" fill="#475569">Synthetic packets only; no live customer or research data.</text>
</svg>
`;
}
