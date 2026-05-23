const fs = require('node:fs');
const path = require('node:path');

const {evaluateRandomizationBlindingIntegrity, buildReviewerPacket} = require('./index');
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
  const width = 1280;
  const height = 720;
  const findingWidth = Math.max(20, Math.min(760, result.findings.length * 72));
  const scoreWidth = Math.max(20, Math.min(760, result.readinessScore * 7.6));
  const actionWidth = Math.max(20, Math.min(760, result.requiredActions.length * 90));
  const topFindings = result.findings.slice(0, 5);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f6f1e8"/>
  <rect x="64" y="56" width="1152" height="608" rx="24" fill="#ffffff" stroke="#202124" stroke-width="4"/>
  <text x="104" y="124" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#202124">Randomization and blinding integrity</text>
  <text x="104" y="166" font-family="Arial, sans-serif" font-size="22" fill="#5f6368">${escapeXml(result.manuscriptId)} • ${escapeXml(result.decision)}</text>
  <g transform="translate(104 220)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#202124">Readiness score</text>
    <rect x="0" y="20" width="760" height="34" rx="17" fill="#e8eaed"/>
    <rect x="0" y="20" width="${scoreWidth}" height="34" rx="17" fill="#2e7d32"/>
    <text x="792" y="47" font-family="Arial, sans-serif" font-size="26" fill="#202124">${result.readinessScore}/100</text>
  </g>
  <g transform="translate(104 314)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#202124">Findings</text>
    <rect x="0" y="20" width="760" height="34" rx="17" fill="#e8eaed"/>
    <rect x="0" y="20" width="${findingWidth}" height="34" rx="17" fill="#c2410c"/>
    <text x="792" y="47" font-family="Arial, sans-serif" font-size="26" fill="#202124">${result.findings.length}</text>
  </g>
  <g transform="translate(104 408)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#202124">Required actions</text>
    <rect x="0" y="20" width="760" height="34" rx="17" fill="#e8eaed"/>
    <rect x="0" y="20" width="${actionWidth}" height="34" rx="17" fill="#1565c0"/>
    <text x="792" y="47" font-family="Arial, sans-serif" font-size="26" fill="#202124">${result.requiredActions.length}</text>
  </g>
  <text x="104" y="522" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#202124">Top reviewer checks</text>
  ${topFindings.map((finding, index) => `<text x="128" y="${562 + index * 30}" font-family="Arial, sans-serif" font-size="21" fill="#202124">• ${escapeXml(finding.type)} in ${escapeXml(finding.studyId)}</text>`).join('\n  ')}
  <text x="104" y="632" font-family="Arial, sans-serif" font-size="18" fill="#5f6368">Synthetic data only. No external services, credentials, patient data, or live manuscripts.</text>
</svg>`;
}

function main() {
  fs.mkdirSync(REPORT_DIR, {recursive: true});
  const result = evaluateRandomizationBlindingIntegrity(samplePacket);
  const markdown = buildReviewerPacket(result);

  fs.writeFileSync(path.join(REPORT_DIR, 'randomization-blinding-packet.json'), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, 'randomization-blinding-report.md'), markdown);
  fs.writeFileSync(path.join(REPORT_DIR, 'summary.svg'), buildSummarySvg(result));

  console.log(JSON.stringify({
    manuscriptId: result.manuscriptId,
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
