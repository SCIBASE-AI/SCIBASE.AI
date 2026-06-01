const fs = require("fs");
const path = require("path");

const { assessAccessibilityLocalization } = require("./index");
const { accessibleChallenge, riskyChallenge } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

function markdownReport(name, report) {
  const findings = report.findings.length
    ? report.findings
        .map((item) => `- ${item.severity.toUpperCase()} ${item.code}: ${item.message} Affected: ${item.affectedTeams.join(", ")}`)
        .join("\n")
    : "- No accessibility or localization findings.";
  return `# ${report.title}

Scenario: ${name}

Decision: ${report.decision.toUpperCase()}

Reviewed ${report.summary.teamsReviewed} solver teams, ${report.summary.materialsReviewed} materials, and ${report.summary.formsReviewed} forms.

## Findings

${findings}

## Release Criteria

${report.releaseCriteria.map((item) => `- ${item}`).join("\n")}
`;
}

function svgReport(report) {
  const color = report.decision === "hold" ? "#dc2626" : report.decision === "revise" ? "#d97706" : "#16a34a";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420">
  <rect width="900" height="420" fill="#0f172a"/>
  <text x="42" y="70" fill="#f8fafc" font-family="Arial" font-size="33">Challenge Accessibility Localization Guard</text>
  <text x="42" y="118" fill="#cbd5e1" font-family="Arial" font-size="20">${report.challengeId}</text>
  <rect x="42" y="156" width="220" height="82" rx="8" fill="${color}"/>
  <text x="68" y="207" fill="#fff" font-family="Arial" font-size="30">${report.decision.toUpperCase()}</text>
  <text x="42" y="286" fill="#e5e7eb" font-family="Arial" font-size="22">Findings: ${report.summary.findings}</text>
  <text x="42" y="326" fill="#fecaca" font-family="Arial" font-size="20">High: ${report.summary.high}</text>
  <text x="172" y="326" fill="#fed7aa" font-family="Arial" font-size="20">Medium: ${report.summary.medium}</text>
  <text x="342" y="326" fill="#bfdbfe" font-family="Arial" font-size="20">Low: ${report.summary.low}</text>
  <text x="42" y="372" fill="#94a3b8" font-family="Arial" font-size="18">Synthetic challenge packet only. No external translation or private data.</text>
</svg>`;
}

for (const [name, challenge] of [
  ["accessible-challenge", accessibleChallenge],
  ["risky-challenge", riskyChallenge],
]) {
  const report = assessAccessibilityLocalization(challenge);
  fs.writeFileSync(path.join(reportsDir, `${name}.json`), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportsDir, `${name}.md`), markdownReport(name, report));
  fs.writeFileSync(path.join(reportsDir, `${name}.svg`), svgReport(report));
  console.log(`${name}: ${report.decision} (${report.summary.findings} findings)`);
}
