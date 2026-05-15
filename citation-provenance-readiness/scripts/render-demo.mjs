import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import project from "../examples/project.json" with { type: "json" };
import { buildCitationProvenanceReadiness } from "../src/citation-provenance-readiness.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docsDir = join(root, "docs");
mkdirSync(docsDir, { recursive: true });

const report = buildCitationProvenanceReadiness(project);
const topInsertion = report.citationInsertions[0];
const topDiagnostic = report.diagnostics[0];
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0f172a"/>
  <rect x="56" y="52" width="1168" height="616" rx="22" fill="#f8fafc"/>
  <text x="96" y="118" fill="#0f172a" font-family="Arial, sans-serif" font-size="40" font-weight="700">Citation provenance readiness</text>
  <text x="96" y="164" fill="#475569" font-family="Arial, sans-serif" font-size="24">${escapeXml(report.title)}</text>
  <rect x="96" y="210" width="270" height="116" rx="18" fill="#fee2e2"/>
  <text x="124" y="258" fill="#991b1b" font-family="Arial, sans-serif" font-size="26" font-weight="700">Status</text>
  <text x="124" y="298" fill="#7f1d1d" font-family="Arial, sans-serif" font-size="32">${escapeXml(report.readinessStatus)}</text>
  <rect x="394" y="210" width="270" height="116" rx="18" fill="#e0f2fe"/>
  <text x="422" y="258" fill="#075985" font-family="Arial, sans-serif" font-size="26" font-weight="700">Score</text>
  <text x="422" y="298" fill="#0c4a6e" font-family="Arial, sans-serif" font-size="32">${report.readinessScore}/100</text>
  <rect x="692" y="210" width="452" height="116" rx="18" fill="#ecfccb"/>
  <text x="720" y="258" fill="#3f6212" font-family="Arial, sans-serif" font-size="26" font-weight="700">Recommended citation</text>
  <text x="720" y="298" fill="#365314" font-family="Arial, sans-serif" font-size="32">@${escapeXml(topInsertion.recommendedCitations[0].key)}</text>
  <text x="96" y="396" fill="#0f172a" font-family="Arial, sans-serif" font-size="28" font-weight="700">Top reviewer action</text>
  <text x="96" y="438" fill="#334155" font-family="Arial, sans-serif" font-size="24">${escapeXml(topDiagnostic.action)}</text>
  <text x="96" y="504" fill="#0f172a" font-family="Arial, sans-serif" font-size="28" font-weight="700">Missing bibliography</text>
  <text x="96" y="546" fill="#334155" font-family="Arial, sans-serif" font-size="24">${escapeXml(report.missingBibliography.join(", ") || "none")}</text>
  <text x="96" y="612" fill="#64748b" font-family="Arial, sans-serif" font-size="20">Digest ${report.digest.slice(0, 24)}</text>
</svg>
`;

writeFileSync(join(docsDir, "demo.svg"), svg);
console.log(`Wrote ${join(docsDir, "demo.svg")}`);

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
