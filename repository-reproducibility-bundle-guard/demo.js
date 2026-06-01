const fs = require("fs");
const path = require("path");

const { assessReproducibilityBundle } = require("./index");
const { releaseCandidate, riskyCandidate } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

function markdownReport(name, report) {
  const findings = report.findings.length
    ? report.findings
        .map((item) => `- ${item.severity.toUpperCase()} ${item.code}: ${item.message}`)
        .join("\n")
    : "- No reproducibility bundle findings.";
  return `# Repository Reproducibility Bundle Guard

Scenario: ${name}

Repository: ${report.repositoryId}
Release tag: ${report.releaseTag}
Decision: ${report.decision.toUpperCase()}

Reviewed ${report.summary.componentsReviewed} manifest components and ${report.summary.bundleEntries} bundle entries.

## Findings

${findings}

## Release Criteria

${report.releaseCriteria.map((item) => `- ${item}`).join("\n")}
`;
}

function svgReport(report) {
  const color = report.decision === "hold" ? "#b91c1c" : report.decision === "revise" ? "#c2410c" : "#15803d";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="430" viewBox="0 0 920 430">
  <rect width="920" height="430" fill="#111827"/>
  <text x="42" y="66" fill="#f8fafc" font-family="Arial" font-size="32">Repository Reproducibility Bundle Guard</text>
  <text x="42" y="112" fill="#cbd5e1" font-family="Arial" font-size="20">${report.repositoryId} / ${report.releaseTag}</text>
  <rect x="42" y="150" width="210" height="80" rx="8" fill="${color}"/>
  <text x="68" y="201" fill="#fff" font-family="Arial" font-size="30">${report.decision.toUpperCase()}</text>
  <text x="42" y="280" fill="#e5e7eb" font-family="Arial" font-size="22">Components: ${report.summary.componentsReviewed}</text>
  <text x="42" y="320" fill="#fecaca" font-family="Arial" font-size="20">High: ${report.summary.high}</text>
  <text x="172" y="320" fill="#fed7aa" font-family="Arial" font-size="20">Medium: ${report.summary.medium}</text>
  <text x="342" y="320" fill="#bfdbfe" font-family="Arial" font-size="20">Low: ${report.summary.low}</text>
  <text x="42" y="374" fill="#94a3b8" font-family="Arial" font-size="18">Synthetic release packets only. No private data or external services.</text>
</svg>`;
}

for (const [name, candidate] of [
  ["release-candidate", releaseCandidate],
  ["risky-candidate", riskyCandidate],
]) {
  const report = assessReproducibilityBundle(candidate);
  fs.writeFileSync(path.join(reportsDir, `${name}.json`), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportsDir, `${name}.md`), markdownReport(name, report));
  fs.writeFileSync(path.join(reportsDir, `${name}.svg`), svgReport(report));
  console.log(`${name}: ${report.decision} (${report.summary.findings} findings)`);
}
