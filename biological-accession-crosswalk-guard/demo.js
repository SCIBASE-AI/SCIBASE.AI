const fs = require('node:fs');
const path = require('node:path');

const {evaluateBiologicalAccessionCrosswalk, buildReviewerPacket} = require('./index');
const {samplePacket} = require('./sample-data');

const REPORT_DIR = path.join(__dirname, 'reports');

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildSummarySvg(result) {
  const scoreWidth = Math.max(20, Math.min(740, result.readinessScore * 7.4));
  const findingWidth = Math.max(20, Math.min(740, result.findings.length * 70));
  const actionWidth = Math.max(20, Math.min(740, result.requiredActions.length * 82));
  const topFindings = result.findings.slice(0, 5);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#eef4f0"/>
  <rect x="64" y="56" width="1152" height="608" rx="20" fill="#ffffff" stroke="#1f2933" stroke-width="4"/>
  <text x="104" y="124" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#1f2933">Biological accession crosswalk guard</text>
  <text x="104" y="166" font-family="Arial, sans-serif" font-size="22" fill="#52606d">${escapeXml(result.graphId)} • ${escapeXml(result.decision)}</text>
  <g transform="translate(104 222)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#1f2933">Readiness score</text>
    <rect x="0" y="20" width="740" height="34" rx="17" fill="#d9e2ec"/>
    <rect x="0" y="20" width="${scoreWidth}" height="34" rx="17" fill="#2f855a"/>
    <text x="772" y="47" font-family="Arial, sans-serif" font-size="26" fill="#1f2933">${result.readinessScore}/100</text>
  </g>
  <g transform="translate(104 314)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#1f2933">Findings</text>
    <rect x="0" y="20" width="740" height="34" rx="17" fill="#d9e2ec"/>
    <rect x="0" y="20" width="${findingWidth}" height="34" rx="17" fill="#c2410c"/>
    <text x="772" y="47" font-family="Arial, sans-serif" font-size="26" fill="#1f2933">${result.findings.length}</text>
  </g>
  <g transform="translate(104 406)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#1f2933">Required actions</text>
    <rect x="0" y="20" width="740" height="34" rx="17" fill="#d9e2ec"/>
    <rect x="0" y="20" width="${actionWidth}" height="34" rx="17" fill="#1d4ed8"/>
    <text x="772" y="47" font-family="Arial, sans-serif" font-size="26" fill="#1f2933">${result.requiredActions.length}</text>
  </g>
  <text x="104" y="522" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#1f2933">Top curator checks</text>
  ${topFindings.map((finding, index) => `<text x="128" y="${562 + index * 30}" font-family="Arial, sans-serif" font-size="21" fill="#1f2933">• ${escapeXml(finding.type)} for ${escapeXml(finding.nodeId)}</text>`).join('\n  ')}
  <text x="104" y="632" font-family="Arial, sans-serif" font-size="18" fill="#52606d">Synthetic KG data only. No external ontology, registry, or live recommendation calls.</text>
</svg>`;
}

function main() {
  fs.mkdirSync(REPORT_DIR, {recursive: true});
  const result = evaluateBiologicalAccessionCrosswalk(samplePacket);
  fs.writeFileSync(path.join(REPORT_DIR, 'accession-crosswalk-packet.json'), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, 'accession-crosswalk-report.md'), buildReviewerPacket(result));
  fs.writeFileSync(path.join(REPORT_DIR, 'summary.svg'), buildSummarySvg(result));
  console.log(JSON.stringify({
    graphId: result.graphId,
    decision: result.decision,
    readinessScore: result.readinessScore,
    findings: result.findings.length,
    requiredActions: result.requiredActions.length,
    auditDigest: result.auditDigest,
  }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  buildSummarySvg,
};
