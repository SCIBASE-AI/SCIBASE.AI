const fs = require('node:fs');
const path = require('node:path');

const {evaluateRepositoryRetention, buildRetentionReport} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateRepositoryRetention(scenario),
}));

const report = evaluations.map(buildRetentionReport).join('\n---\n');
const decisionJson = JSON.stringify(evaluations, null, 2);

const approved = evaluations.filter((item) => item.decision === 'approved').length;
const blocked = evaluations.filter((item) => item.decision === 'blocked').length;
const remediation = evaluations.filter((item) => item.decision === 'needs-remediation').length;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#0f172a"/>
  <text x="48" y="72" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="34" font-weight="700">Repository Retention Legal Hold Gate</text>
  <text x="48" y="112" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">Synthetic review packet for project repository release governance</text>
  <g transform="translate(48 160)">
    <rect width="250" height="160" rx="14" fill="#14532d"/>
    <text x="24" y="52" fill="#dcfce7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Approved</text>
    <text x="24" y="112" fill="#f0fdf4" font-family="Arial, sans-serif" font-size="58" font-weight="700">${approved}</text>
  </g>
  <g transform="translate(354 160)">
    <rect width="250" height="160" rx="14" fill="#713f12"/>
    <text x="24" y="52" fill="#fef3c7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Needs Remediation</text>
    <text x="24" y="112" fill="#fffbeb" font-family="Arial, sans-serif" font-size="58" font-weight="700">${remediation}</text>
  </g>
  <g transform="translate(660 160)">
    <rect width="250" height="160" rx="14" fill="#7f1d1d"/>
    <text x="24" y="52" fill="#fee2e2" font-family="Arial, sans-serif" font-size="20" font-weight="700">Blocked</text>
    <text x="24" y="112" fill="#fef2f2" font-family="Arial, sans-serif" font-size="58" font-weight="700">${blocked}</text>
  </g>
  <text x="48" y="390" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="22">Checks: legal holds, archive evidence, content hashes, export manifest hashes</text>
  <text x="48" y="430" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">Outputs: decision.json, report.md, retention-gate.svg, demo video artifact</text>
  <text x="48" y="478" fill="#64748b" font-family="Arial, sans-serif" font-size="16">No real secrets, patient data, private repositories, or external service calls.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'decision.json'), `${decisionJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'report.md'), report);
fs.writeFileSync(path.join(reportsDir, 'retention-gate.svg'), svg);

console.log(`Wrote ${evaluations.length} retention evaluations to ${reportsDir}`);
console.log(`Decision counts: approved=${approved}, remediation=${remediation}, blocked=${blocked}`);
