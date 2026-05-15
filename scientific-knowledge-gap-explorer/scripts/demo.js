"use strict";

const fs = require("node:fs");
const path = require("node:path");
const projects = require("../data/sample-projects.json");
const {
  buildEntityPage,
  buildKnowledgeGraph,
  buildRecommendationDigest,
  findKnowledgeGaps
} = require("../src/knowledge-gap-explorer");

const outDir = path.join(__dirname, "..", "docs");
fs.mkdirSync(outDir, { recursive: true });

const graph = buildKnowledgeGraph(projects);
const gaps = findKnowledgeGaps(graph, { minEvidence: 2, limit: 5 });
const digest = buildRecommendationDigest(
  graph,
  { interests: ["CRISPR screening", "single-cell RNA-seq", "latent phenotypes"] },
  { minEvidence: 2, limit: 3 }
);
const entityPage = buildEntityPage(graph, "concept:crispr-screening");

const output = {
  generatedAt: "2026-05-15T00:00:00.000Z",
  graphSummary: {
    projects: graph.projects.length,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    citations: graph.citations.length
  },
  topKnowledgeGaps: gaps,
  personalizedDigest: digest,
  sampleEntityPage: entityPage
};

fs.writeFileSync(path.join(outDir, "demo-output.json"), `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "demo.svg"), buildSvg(output));
console.log(JSON.stringify(output.graphSummary));
console.log(`top gap: ${gaps[0].concept.label} + ${gaps[0].method.label} + ${gaps[0].dataset.label}`);

function buildSvg(output) {
  const rows = output.topKnowledgeGaps.slice(0, 4).map((gap, index) => {
    const y = 178 + index * 92;
    const title = escapeXml(`${gap.concept.label} + ${gap.method.label}`);
    const detail = escapeXml(`Dataset: ${gap.dataset.label} | evidence ${gap.evidenceScore} | score ${gap.score}`);
    return `
      <g transform="translate(70 ${y})">
        <rect width="1140" height="68" rx="14" fill="${index === 0 ? "#e7f5ff" : "#f7f7f8"}" stroke="#d8dee9"/>
        <text x="22" y="29" fill="#151515" font-size="24" font-weight="700">${title}</text>
        <text x="22" y="54" fill="#4b5563" font-size="17">${detail}</text>
        <circle cx="1080" cy="34" r="24" fill="${index === 0 ? "#0f766e" : "#334155"}"/>
        <text x="1080" y="41" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="700">${index + 1}</text>
      </g>`;
  }).join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#ffffff"/>
  <rect x="40" y="38" width="1200" height="644" rx="28" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="70" y="96" fill="#111827" font-family="Arial, sans-serif" font-size="42" font-weight="800">Scientific Knowledge Gap Explorer</text>
  <text x="70" y="130" fill="#475569" font-family="Arial, sans-serif" font-size="20">Ranks underconnected concept-method-dataset intersections with evidence paths.</text>
  <g font-family="Arial, sans-serif">
    <text x="70" y="162" fill="#0f766e" font-size="18" font-weight="700">${output.graphSummary.nodes} nodes</text>
    <text x="178" y="162" fill="#0f766e" font-size="18" font-weight="700">${output.graphSummary.edges} edges</text>
    <text x="284" y="162" fill="#0f766e" font-size="18" font-weight="700">${output.graphSummary.projects} projects</text>
    ${rows}
    <rect x="70" y="566" width="1140" height="72" rx="14" fill="#111827"/>
    <text x="94" y="596" fill="#f8fafc" font-size="20" font-weight="700">Recommendation digest</text>
    <text x="94" y="625" fill="#cbd5e1" font-size="17">${escapeXml(output.personalizedDigest[0].title)}</text>
  </g>
</svg>
`;

  return svg.replace(/[ \t]+$/gm, "");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
