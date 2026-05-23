const fs = require('node:fs');
const path = require('node:path');
const {analyzeTemporalGraph} = require('./index');
const {temporalRiskGraph, temporalValidGraph} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, {recursive: true});

const risk = analyzeTemporalGraph(temporalRiskGraph);
const clean = analyzeTemporalGraph(temporalValidGraph);
const packet = {
  generatedAt: new Date('2026-05-23T00:00:00.000Z').toISOString(),
  guard: 'knowledge-graph-temporal-validity-guard',
  results: [risk, clean],
};

fs.writeFileSync(path.join(reportsDir, 'temporal-validity-packet.json'), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, 'temporal-validity-report.md'), renderMarkdown(packet));
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), renderSvg(risk, clean));

console.log(`risk=${risk.status} blockers=${risk.summary.blockers} suppressed=${risk.summary.suppressedRecommendations}`);
console.log(`clean=${clean.status} blockers=${clean.summary.blockers} suppressed=${clean.summary.suppressedRecommendations}`);
console.log(`reports=${reportsDir}`);

function renderMarkdown(data) {
  const rows = data.results.map((result) => (
    `| ${result.graphId} | ${result.status} | ${result.summary.blockers} | ${result.summary.reviewItems} | ${result.summary.suppressedRecommendations} | ${result.digest} |`
  ));
  const findings = data.results
    .flatMap((result) => result.findings.map((finding) => `- ${result.graphId}: ${finding.code} on ${finding.targetType} \`${finding.targetId}\` - ${finding.message}`))
    .join('\n');

  return `# Knowledge Graph Temporal Validity Guard

This reviewer packet checks whether graph nodes, relationship edges, dataset versions, method applicability windows, author affiliations, and recommendation paths are valid for the graph snapshot date before entity pages or AI recommendations are shown.

| Graph | Status | Blockers | Review items | Suppressed recommendations | Digest |
| --- | --- | ---: | ---: | ---: | --- |
${rows.join('\n')}

## Findings

${findings || '- No temporal findings.'}

## Scope Boundaries

- Synthetic graph fixtures only.
- No network calls, live ontology APIs, private research objects, or graph database mutations.
- Distinct from evidence freshness: this guard checks effective/expiry windows and version validity for graph objects at a specific snapshot date.
`;
}

function renderSvg(risk, clean) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="70" y="70" width="1140" height="580" rx="18" fill="#ffffff" stroke="#1f2933" stroke-width="3"/>
  <text x="112" y="138" font-family="Arial, sans-serif" font-size="45" font-weight="700" fill="#111827">Knowledge graph temporal validity guard</text>
  <text x="112" y="188" font-family="Arial, sans-serif" font-size="25" fill="#374151">Checks effective dates, expiry dates, versions, affiliations, and recommendation paths before graph publication.</text>
  <g transform="translate(112 250)">
    <rect width="488" height="250" rx="14" fill="#fff1f0" stroke="#b42318" stroke-width="3"/>
    <text x="32" y="56" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#b42318">Temporal hold</text>
    <text x="32" y="110" font-family="Arial, sans-serif" font-size="24" fill="#1f2933">${risk.graphId}</text>
    <text x="32" y="160" font-family="Arial, sans-serif" font-size="24" fill="#1f2933">Blockers: ${risk.summary.blockers}</text>
    <text x="32" y="202" font-family="Arial, sans-serif" font-size="24" fill="#1f2933">Suppressed recs: ${risk.summary.suppressedRecommendations}</text>
  </g>
  <g transform="translate(680 250)">
    <rect width="488" height="250" rx="14" fill="#eefaf2" stroke="#147d3f" stroke-width="3"/>
    <text x="32" y="56" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#147d3f">Temporal ready</text>
    <text x="32" y="110" font-family="Arial, sans-serif" font-size="24" fill="#1f2933">${clean.graphId}</text>
    <text x="32" y="160" font-family="Arial, sans-serif" font-size="24" fill="#1f2933">Blockers: ${clean.summary.blockers}</text>
    <text x="32" y="202" font-family="Arial, sans-serif" font-size="24" fill="#1f2933">Suppressed recs: ${clean.summary.suppressedRecommendations}</text>
  </g>
  <text x="112" y="588" font-family="Arial, sans-serif" font-size="24" fill="#4b5563">Reviewer artifacts: JSON packet, Markdown report, SVG summary, H.264 demo video.</text>
</svg>
`;
}
