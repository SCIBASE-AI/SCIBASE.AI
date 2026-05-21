const fs = require('fs');
const path = require('path');
const { evaluateRecommendationDiversity } = require('./index');
const { biasedRecommendationSet } = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportDir, { recursive: true });

const result = evaluateRecommendationDiversity(biasedRecommendationSet);
const packetPath = path.join(reportDir, 'recommendation-diversity-packet.json');
const reportPath = path.join(reportDir, 'recommendation-diversity-report.md');
const svgPath = path.join(reportDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);

const concentrationRows = result.concentrationChecks
  .map((check) => `| ${check.metric} | ${check.result.value} | ${check.result.share} | ${check.limit} |`)
  .join('\n');
const itemRows = result.itemResults
  .map((item) => `| ${item.id} | ${item.status} | ${item.institution || '-'} | ${item.funder || '-'} | ${item.method || '-'} | ${item.blockers.join(', ') || '-'} |`)
  .join('\n');

fs.writeFileSync(
  reportPath,
  `# Knowledge Graph Recommendation Diversity Report

Status: ${result.status}
Audit digest: ${result.auditDigest}

## Recommendation Set

Title: ${result.set.title}
Audience: ${result.set.audience}
Showable recommendations: ${result.showableRecommendations}/${result.totalRecommendations}

## Concentration Checks

| Metric | Top value | Share | Limit |
| --- | --- | ---: | ---: |
${concentrationRows}

## Recommendation Review

| Recommendation | Status | Institution | Funder | Method | Blockers |
| --- | --- | --- | --- | --- | --- |
${itemRows}

## Citation Herd

- Top cited recommendation: ${result.citationHerd.id}
- Citation share: ${result.citationHerd.share}

## Stale Evidence

- Stale evidence share: ${result.staleEvidenceShare}

## Blockers

${result.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Curator Actions

${result.curatorActions.map((action) => `- ${action}`).join('\n')}
`,
);

fs.writeFileSync(
  svgPath,
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="58" y="52" width="844" height="436" rx="18" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="90" y="112" font-family="Arial, sans-serif" font-size="31" font-weight="700" fill="#0f172a">Knowledge Graph Recommendation Guard</text>
  <text x="90" y="154" font-family="Arial, sans-serif" font-size="18" fill="#475569">Status: ${result.status} | Showable: ${result.showableRecommendations}/${result.totalRecommendations}</text>
  <g transform="translate(90 202)">
    <rect width="234" height="126" rx="12" fill="#fee2e2" stroke="#ef4444"/>
    <text x="24" y="52" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#991b1b">${result.blockers.length}</text>
    <text x="24" y="90" font-family="Arial, sans-serif" font-size="17" fill="#991b1b">diversity blockers</text>
  </g>
  <g transform="translate(363 202)">
    <rect width="234" height="126" rx="12" fill="#fef3c7" stroke="#f59e0b"/>
    <text x="24" y="52" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#92400e">${result.warnings.length}</text>
    <text x="24" y="90" font-family="Arial, sans-serif" font-size="17" fill="#92400e">disclosure warnings</text>
  </g>
  <g transform="translate(636 202)">
    <rect width="234" height="126" rx="12" fill="#dbeafe" stroke="#2563eb"/>
    <text x="24" y="52" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#1e40af">${result.staleEvidenceShare}</text>
    <text x="24" y="90" font-family="Arial, sans-serif" font-size="17" fill="#1e40af">stale evidence share</text>
  </g>
  <text x="90" y="390" font-family="Arial, sans-serif" font-size="17" fill="#334155">Top institution share: ${result.concentrationChecks[0].result.share}</text>
  <text x="90" y="422" font-family="Arial, sans-serif" font-size="17" fill="#334155">Top funder share: ${result.concentrationChecks[1].result.share}</text>
  <text x="90" y="454" font-family="Arial, sans-serif" font-size="17" fill="#334155">Digest: ${result.auditDigest.slice(0, 32)}...</text>
</svg>
`,
);

console.log(`status=${result.status}`);
console.log(`showable=${result.showableRecommendations}/${result.totalRecommendations}`);
console.log(`blockers=${result.blockers.length}`);
console.log(`warnings=${result.warnings.length}`);
console.log(`staleEvidenceShare=${result.staleEvidenceShare}`);
console.log(`auditDigest=${result.auditDigest}`);
console.log(`reports=${reportDir}`);
