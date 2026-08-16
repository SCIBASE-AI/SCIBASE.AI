import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { analyzeRerunPackets } from "../src/index.js";

const root = process.cwd();
const reportsDir = join(root, "reports");
const packets = JSON.parse(await readFile(join(root, "data", "sample-rerun-packets.json"), "utf8"));
const report = analyzeRerunPackets(packets);

await mkdir(reportsDir, { recursive: true });
await writeFile(join(reportsDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(reportsDir, "reviewer-packet.md"), renderMarkdown(report));
await writeFile(join(reportsDir, "summary.svg"), renderSvg(report));

console.log(`Wrote ${report.packetCount} packet report to ${reportsDir}`);
console.log(JSON.stringify(report.decisionCounts, null, 2));

function renderMarkdown(reportData) {
  const rows = reportData.results
    .map((result) => {
      const topFindings =
        result.findings.length === 0
          ? "None"
          : result.findings
              .slice(0, 3)
              .map((finding) => `${finding.code} (${finding.severity})`)
              .join("; ");
      return `| ${result.id} | ${result.decision} | ${result.score} | ${result.summary.estimatedWorkingSetGb} GB | ${topFindings} |`;
    })
    .join("\n");

  return `# Research Compute Rerun Feasibility Guard

Generated: ${reportData.generatedAt}

This packet is a local synthetic demonstration for SCIBASE issue #16. It checks whether an AI-powered research assistant should release reproducibility language before the compute plan is practically rerunnable by a reviewer.

| Packet | Release gate | Score | Working set | Top findings |
| --- | --- | ---: | ---: | --- |
${rows}

## Release Policy

- \`RELEASE_ASSISTANT_OUTPUT\`: the assistant can present the rerun as reviewer-feasible.
- \`REVISE_ASSISTANT_OUTPUT\`: assistant wording must be softened until missing resource evidence is repaired.
- \`HOLD_ASSISTANT_OUTPUT\`: the assistant must not endorse reproducibility because compute feasibility is materially unsafe.

No external API, private data, paid cloud, real manuscript, or user desktop capture is used.
`;
}

function renderSvg(reportData) {
  const color = {
    RELEASE_ASSISTANT_OUTPUT: "#1f9d55",
    REVISE_ASSISTANT_OUTPUT: "#c27803",
    HOLD_ASSISTANT_OUTPUT: "#c2410c"
  };
  const rows = reportData.results
    .map((result, index) => {
      const y = 112 + index * 86;
      const barWidth = Math.max(16, result.score * 5.1);
      return `
  <g transform="translate(52 ${y})">
    <text x="0" y="0" class="id">${escapeXml(result.id)}</text>
    <rect x="0" y="16" width="510" height="18" rx="4" fill="#e5e7eb"/>
    <rect x="0" y="16" width="${barWidth}" height="18" rx="4" fill="${color[result.decision]}"/>
    <text x="530" y="30" class="score">${result.score}/100</text>
    <text x="0" y="58" class="decision" fill="${color[result.decision]}">${result.decision}</text>
  </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
  <rect width="900" height="520" fill="#f8fafc"/>
  <text x="52" y="56" class="title">Compute Rerun Feasibility Guard</text>
  <text x="52" y="84" class="subtitle">AI assistant release gate for practical reproducibility claims</text>
${rows}
  <style>
    .title { font: 700 28px Arial, sans-serif; fill: #111827; }
    .subtitle { font: 16px Arial, sans-serif; fill: #475569; }
    .id { font: 700 16px Arial, sans-serif; fill: #111827; }
    .score { font: 700 15px Arial, sans-serif; fill: #111827; }
    .decision { font: 700 13px Arial, sans-serif; }
  </style>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
