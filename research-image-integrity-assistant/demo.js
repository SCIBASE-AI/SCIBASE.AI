const fs = require('node:fs');
const path = require('node:path');

const {evaluateImageIntegrity, buildReviewerReport} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateImageIntegrity(scenario),
}));

const reviewerReport = evaluations.map(buildReviewerReport).join('\n---\n');
const packetJson = JSON.stringify(evaluations, null, 2);
const approved = evaluations.filter((item) => item.decision === 'approved').length;
const response = evaluations.filter((item) => item.decision === 'needs-author-response').length;
const hold = evaluations.filter((item) => item.decision === 'hold-for-review').length;
const findings = evaluations.reduce((sum, item) => sum + item.findings.length, 0);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <text x="48" y="72" fill="#f9fafb" font-family="Arial, sans-serif" font-size="34" font-weight="700">Research Image Integrity Assistant</text>
  <text x="48" y="112" fill="#c7d2fe" font-family="Arial, sans-serif" font-size="18">Synthetic reviewer packet for manuscript figure forensics</text>
  <g transform="translate(48 158)">
    <rect width="250" height="154" rx="10" fill="#065f46"/>
    <text x="24" y="48" fill="#d1fae5" font-family="Arial, sans-serif" font-size="20" font-weight="700">Approved</text>
    <text x="24" y="108" fill="#ecfdf5" font-family="Arial, sans-serif" font-size="58" font-weight="700">${approved}</text>
  </g>
  <g transform="translate(354 158)">
    <rect width="250" height="154" rx="10" fill="#92400e"/>
    <text x="24" y="48" fill="#fef3c7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Author Response</text>
    <text x="24" y="108" fill="#fffbeb" font-family="Arial, sans-serif" font-size="58" font-weight="700">${response}</text>
  </g>
  <g transform="translate(660 158)">
    <rect width="250" height="154" rx="10" fill="#991b1b"/>
    <text x="24" y="48" fill="#fee2e2" font-family="Arial, sans-serif" font-size="20" font-weight="700">Hold Review</text>
    <text x="24" y="108" fill="#fef2f2" font-family="Arial, sans-serif" font-size="58" font-weight="700">${hold}</text>
  </g>
  <text x="48" y="382" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="22">Checks: duplicate panels, raw provenance, processing logs, scale-bar metadata</text>
  <text x="48" y="424" fill="#d1d5db" font-family="Arial, sans-serif" font-size="18">Reviewer findings: ${findings}. Outputs: JSON packet, Markdown report, SVG summary, MP4 artifact.</text>
  <text x="48" y="478" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">Synthetic data only. No patient data, private images, secrets, external APIs, or network calls.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'image-integrity-packet.json'), `${packetJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'reviewer-report.md'), reviewerReport);
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), svg);

console.log(`Wrote ${evaluations.length} image-integrity evaluations to ${reportsDir}`);
console.log(`Decision counts: approved=${approved}, response=${response}, hold=${hold}`);
console.log(`Reviewer findings: ${findings}`);
