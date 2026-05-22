const fs = require('node:fs');
const path = require('node:path');

const {evaluateLmsSyncGuard, buildLmsSyncReport} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateLmsSyncGuard(scenario),
}));

const packetJson = JSON.stringify(evaluations, null, 2);
const reviewerReport = evaluations.map(buildLmsSyncReport).join('\n---\n');
const approved = evaluations.filter((item) => item.decision === 'approve-sync').length;
const review = evaluations.filter((item) => item.decision === 'needs-admin-review').length;
const passback = evaluations.filter((item) => item.decision === 'hold-passback').length;
const blocked = evaluations.filter((item) => item.decision === 'block-sync').length;
const findings = evaluations.reduce((sum, item) => sum + item.findings.length, 0);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <text x="48" y="72" fill="#f9fafb" font-family="Arial, sans-serif" font-size="34" font-weight="700">Enterprise LMS Roster Passback Guard</text>
  <text x="48" y="112" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="18">Synthetic Canvas/Moodle roster and grade sync safety packet</text>
  <g transform="translate(48 158)">
    <rect width="190" height="154" rx="10" fill="#065f46"/>
    <text x="22" y="48" fill="#d1fae5" font-family="Arial, sans-serif" font-size="18" font-weight="700">Approve</text>
    <text x="22" y="108" fill="#ecfdf5" font-family="Arial, sans-serif" font-size="54" font-weight="700">${approved}</text>
  </g>
  <g transform="translate(270 158)">
    <rect width="190" height="154" rx="10" fill="#854d0e"/>
    <text x="22" y="48" fill="#fef3c7" font-family="Arial, sans-serif" font-size="18" font-weight="700">Admin Review</text>
    <text x="22" y="108" fill="#fffbeb" font-family="Arial, sans-serif" font-size="54" font-weight="700">${review}</text>
  </g>
  <g transform="translate(492 158)">
    <rect width="190" height="154" rx="10" fill="#7c2d12"/>
    <text x="22" y="48" fill="#fed7aa" font-family="Arial, sans-serif" font-size="18" font-weight="700">Passback Hold</text>
    <text x="22" y="108" fill="#fff7ed" font-family="Arial, sans-serif" font-size="54" font-weight="700">${passback}</text>
  </g>
  <g transform="translate(714 158)">
    <rect width="190" height="154" rx="10" fill="#991b1b"/>
    <text x="22" y="48" fill="#fee2e2" font-family="Arial, sans-serif" font-size="18" font-weight="700">Block</text>
    <text x="22" y="108" fill="#fef2f2" font-family="Arial, sans-serif" font-size="54" font-weight="700">${blocked}</text>
  </g>
  <text x="48" y="382" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="22">Checks: approved sections, FERPA consent, ORCID linkage, release windows, webhook receipts</text>
  <text x="48" y="424" fill="#d1d5db" font-family="Arial, sans-serif" font-size="18">Reviewer findings: ${findings}. Outputs: JSON packet, Markdown report, SVG summary, MP4 artifact.</text>
  <text x="48" y="478" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">Synthetic data only. No live LMS calls, student records, credentials, or external providers.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'lms-sync-packet.json'), `${packetJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'lms-sync-report.md'), reviewerReport);
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), svg);

console.log(`Wrote ${evaluations.length} LMS sync evaluations to ${reportsDir}`);
console.log(`Decision counts: approved=${approved}, review=${review}, passback=${passback}, blocked=${blocked}`);
console.log(`Reviewer findings: ${findings}`);
