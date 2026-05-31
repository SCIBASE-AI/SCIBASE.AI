"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeFundingAwardGraph } = require("./fundingAwardProvenanceGraphGuard");
const { sampleFundingRecords } = require("./sampleFundingRecords");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = analyzeFundingAwardGraph(sampleFundingRecords);
fs.writeFileSync(
  path.join(reportsDir, "funding-award-provenance-packet.json"),
  JSON.stringify(packet, null, 2) + "\n",
);

const decisionLines = packet.decisions.map((item) => {
  const codes = item.findings.map((finding) => finding.code).join(", ") || "none";
  return `- ${item.recordId}: ${item.decision} (${codes})`;
});

const report = [
  "# Funding Award Provenance Graph Guard",
  "",
  `Status: **${packet.status}**`,
  "",
  "## Summary",
  "",
  `- Records checked: ${packet.summary.records}`,
  `- Release: ${packet.summary.release}`,
  `- Review: ${packet.summary.review}`,
  `- Hold: ${packet.summary.hold}`,
  `- Findings: ${packet.summary.findings}`,
  "",
  "## Decisions",
  "",
  ...decisionLines,
  "",
  "## Scope",
  "",
  "This guard supports Scientific Knowledge Graph Integration by blocking unsafe funder, grant, award, project, output, and recommendation relationships before funding paths are published on entity pages or used in recommendations.",
  "",
].join("\n");

fs.writeFileSync(path.join(reportsDir, "funding-award-provenance-report.md"), report);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#101827"/>
  <text x="56" y="76" fill="#ffffff" font-family="Arial" font-size="34" font-weight="700">Funding award provenance graph guard</text>
  <text x="56" y="126" fill="#9cc9ff" font-family="Arial" font-size="24">Status: ${packet.status.toUpperCase()}</text>
  <rect x="56" y="176" width="190" height="118" rx="8" fill="#1f3442"/>
  <text x="86" y="226" fill="#ffffff" font-family="Arial" font-size="42">${packet.summary.records}</text>
  <text x="86" y="264" fill="#c7d7df" font-family="Arial" font-size="19">records checked</text>
  <rect x="276" y="176" width="190" height="118" rx="8" fill="#18382f"/>
  <text x="306" y="226" fill="#ffffff" font-family="Arial" font-size="42">${packet.summary.release}</text>
  <text x="306" y="264" fill="#bde4d7" font-family="Arial" font-size="19">release</text>
  <rect x="496" y="176" width="190" height="118" rx="8" fill="#3c3218"/>
  <text x="526" y="226" fill="#ffffff" font-family="Arial" font-size="42">${packet.summary.review}</text>
  <text x="526" y="264" fill="#f2dc92" font-family="Arial" font-size="19">review</text>
  <rect x="716" y="176" width="190" height="118" rx="8" fill="#3d1f2b"/>
  <text x="746" y="226" fill="#ffffff" font-family="Arial" font-size="42">${packet.summary.hold}</text>
  <text x="746" y="264" fill="#f0b7c0" font-family="Arial" font-size="19">hold</text>
  <text x="56" y="366" fill="#dbe5ea" font-family="Arial" font-size="21">Validates funder aliases, award IDs, acknowledgements, DOI/project links, dates, COI flags, and private funding paths.</text>
  <text x="56" y="414" fill="#dbe5ea" font-family="Arial" font-size="21">Graph action: publish, curator review, or block before recommendation release.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);
console.log(report);
