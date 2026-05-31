import { mkdir, writeFile } from "node:fs/promises";
import { projects, repositoryPolicies, reviewDate } from "./sample-data.js";
import { runCredentialRotationReview } from "./index.js";

const reportDir = new URL("./reports/", import.meta.url);
const packet = runCredentialRotationReview(projects, repositoryPolicies, reviewDate);

function renderMarkdown(packet) {
  const lines = [
    "# Repository Automation Credential Rotation Report",
    "",
    `Generated: ${packet.generatedAt}`,
    `Audit digest: \`${packet.auditDigest}\``,
    "",
    "## Summary",
    "",
    `- Projects reviewed: ${packet.summary.projects}`,
    `- Credentials reviewed: ${packet.summary.credentials}`,
    `- Critical findings: ${packet.summary.severityCounts.critical}`,
    `- High findings: ${packet.summary.severityCounts.high}`,
    `- Medium findings: ${packet.summary.severityCounts.medium}`,
    "",
    "## Project Decisions",
    ""
  ];

  for (const project of packet.projectReports) {
    lines.push(
      `### ${project.projectId}`,
      "",
      `- Repository: \`${project.repository}\``,
      `- Release candidate: \`${project.releaseCandidate}\``,
      `- Decision: **${project.decision}**`,
      `- Findings: ${project.severityCounts.critical} critical, ${project.severityCounts.high} high, ${project.severityCounts.medium} medium`,
      "",
      "| Credential | Decision | Critical | High | Medium | Key Finding |",
      "| --- | --- | ---: | ---: | ---: | --- |"
    );

    for (const report of project.credentialReports) {
      const keyFinding = report.findings[0]?.message ?? "No blockers found.";
      lines.push(
        `| ${report.credentialId} | ${report.decision} | ${report.severityCounts.critical} | ${report.severityCounts.high} | ${report.severityCounts.medium} | ${keyFinding} |`
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const decisions = packet.summary.decisions;
  const hold = decisions["hold-release"] ?? 0;
  const rotate = decisions["rotate-before-release"] ?? 0;
  const review = decisions["review-before-release"] ?? 0;
  const release = decisions["release-ready"] ?? 0;
  const critical = packet.summary.severityCounts.critical;
  const high = packet.summary.severityCounts.high;
  const medium = packet.summary.severityCounts.medium;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Repository automation credential rotation guard summary</title>
  <desc id="desc">Decision and finding counts for synthetic SCIBASE repository automation credential review.</desc>
  <rect width="1280" height="720" fill="#f7f3e8"/>
  <rect x="72" y="64" width="1136" height="592" rx="8" fill="#ffffff" stroke="#243447" stroke-width="4"/>
  <text x="112" y="130" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#243447">Automation credential rotation guard</text>
  <text x="112" y="180" font-family="Arial, sans-serif" font-size="24" fill="#4b5563">Synthetic repository release review for SCIBASE issue #10</text>
  <g font-family="Arial, sans-serif" font-size="28" font-weight="700">
    <rect x="112" y="240" width="230" height="112" fill="#c2410c"/>
    <text x="142" y="304" fill="#fff">Hold: ${hold}</text>
    <rect x="374" y="240" width="230" height="112" fill="#b45309"/>
    <text x="404" y="304" fill="#fff">Rotate: ${rotate}</text>
    <rect x="636" y="240" width="230" height="112" fill="#047857"/>
    <text x="666" y="304" fill="#fff">Release: ${release}</text>
    <rect x="898" y="240" width="230" height="112" fill="#475569"/>
    <text x="928" y="304" fill="#fff">Review: ${review}</text>
  </g>
  <g font-family="Arial, sans-serif" font-size="24" fill="#243447">
    <text x="112" y="430">Findings</text>
    <text x="112" y="482">Critical: ${critical}</text>
    <text x="112" y="526">High: ${high}</text>
    <text x="112" y="570">Medium: ${medium}</text>
    <text x="420" y="482">Credentials reviewed: ${packet.summary.credentials}</text>
    <text x="420" y="526">Projects reviewed: ${packet.summary.projects}</text>
    <text x="420" y="570">Digest: ${packet.auditDigest.slice(0, 22)}...</text>
  </g>
</svg>
`;
}

await mkdir(reportDir, { recursive: true });
await writeFile(new URL("credential-rotation-packet.json", reportDir), `${JSON.stringify(packet, null, 2)}\n`);
await writeFile(new URL("credential-rotation-report.md", reportDir), renderMarkdown(packet));
await writeFile(new URL("summary.svg", reportDir), renderSvg(packet));

console.log("Generated repository automation credential rotation reviewer artifacts:");
console.log("- reports/credential-rotation-packet.json");
console.log("- reports/credential-rotation-report.md");
console.log("- reports/summary.svg");
console.log(`Audit digest: ${packet.auditDigest}`);
