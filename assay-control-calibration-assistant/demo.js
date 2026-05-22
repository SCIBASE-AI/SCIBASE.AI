const fs = require('node:fs');
const path = require('node:path');

const {
  evaluateAssayControlCalibration,
  buildReviewerPacket,
} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateAssayControlCalibration(scenario),
}));

const reviewerPacket = evaluations.map(buildReviewerPacket).join('\n---\n');
const packetJson = JSON.stringify(evaluations, null, 2);
const approved = evaluations.filter((item) => item.decision === 'approved').length;
const response = evaluations.filter((item) => item.decision === 'needs-author-response').length;
const hold = evaluations.filter((item) => item.decision === 'hold-for-review').length;
const findings = evaluations.reduce((sum, item) => sum + item.findings.length, 0);
const missingControls = evaluations.reduce((sum, item) => sum + item.summary.missingControls, 0);
const calibrationIssues = evaluations.reduce((sum, item) => sum + item.summary.calibrationIssues, 0);
const qcIssues = evaluations.reduce((sum, item) => sum + item.summary.qcIssues, 0);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#0f172a"/>
  <text x="48" y="72" fill="#f8fafc" font-family="Arial, sans-serif" font-size="34" font-weight="700">Assay Control Calibration Assistant</text>
  <text x="48" y="112" fill="#bae6fd" font-family="Arial, sans-serif" font-size="18">Synthetic reviewer packet for assay controls, standards, calibration drift, and QC replicates</text>
  <g transform="translate(48 158)">
    <rect width="250" height="154" rx="8" fill="#047857"/>
    <text x="24" y="48" fill="#d1fae5" font-family="Arial, sans-serif" font-size="20" font-weight="700">Approved</text>
    <text x="24" y="108" fill="#ecfdf5" font-family="Arial, sans-serif" font-size="58" font-weight="700">${approved}</text>
  </g>
  <g transform="translate(354 158)">
    <rect width="250" height="154" rx="8" fill="#a16207"/>
    <text x="24" y="48" fill="#fef3c7" font-family="Arial, sans-serif" font-size="20" font-weight="700">Author Response</text>
    <text x="24" y="108" fill="#fffbeb" font-family="Arial, sans-serif" font-size="58" font-weight="700">${response}</text>
  </g>
  <g transform="translate(660 158)">
    <rect width="250" height="154" rx="8" fill="#b91c1c"/>
    <text x="24" y="48" fill="#fee2e2" font-family="Arial, sans-serif" font-size="20" font-weight="700">Hold Review</text>
    <text x="24" y="108" fill="#fef2f2" font-family="Arial, sans-serif" font-size="58" font-weight="700">${hold}</text>
  </g>
  <text x="48" y="378" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="22">Findings: ${findings}. Missing controls: ${missingControls}. Calibration issues: ${calibrationIssues}. QC issues: ${qcIssues}.</text>
  <text x="48" y="420" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">Checks: positive/negative/blank controls, standard curve fit, calibration drift, QC replicate variation.</text>
  <text x="48" y="478" fill="#94a3b8" font-family="Arial, sans-serif" font-size="16">Synthetic data only. No private manuscripts, lab data, credentials, external APIs, or network calls.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'assay-control-calibration-packet.json'), `${packetJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'reviewer-packet.md'), reviewerPacket);
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), svg);

console.log(`Wrote ${evaluations.length} assay-control evaluations to ${reportsDir}`);
console.log(`Decision counts: approved=${approved}, response=${response}, hold=${hold}`);
console.log(`Findings=${findings}, missingControls=${missingControls}, calibrationIssues=${calibrationIssues}, qcIssues=${qcIssues}`);
