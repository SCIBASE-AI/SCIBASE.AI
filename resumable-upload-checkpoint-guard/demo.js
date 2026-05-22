const fs = require('node:fs');
const path = require('node:path');

const {evaluateUploadCheckpoint, buildCheckpointReport} = require('./index');
const {scenarios} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, {recursive: true});

const evaluations = scenarios.map((scenario) => ({
  scenario: scenario.name,
  ...evaluateUploadCheckpoint(scenario),
}));

const packetJson = JSON.stringify(evaluations, null, 2);
const reviewerReport = evaluations.map(buildCheckpointReport).join('\n---\n');
const commit = evaluations.filter((item) => item.decision === 'commit-artifact').length;
const metadata = evaluations.filter((item) => item.decision === 'hold-metadata').length;
const resume = evaluations.filter((item) => item.decision === 'hold-resume').length;
const abort = evaluations.filter((item) => item.decision === 'abort-and-reupload').length;
const findings = evaluations.reduce((sum, item) => sum + item.findings.length, 0);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#101820"/>
  <text x="48" y="72" fill="#f8fafc" font-family="Arial, sans-serif" font-size="34" font-weight="700">Resumable Upload Checkpoint Guard</text>
  <text x="48" y="112" fill="#bae6fd" font-family="Arial, sans-serif" font-size="18">Synthetic multipart upload safety packet for scientific artifacts</text>
  <g transform="translate(48 158)">
    <rect width="190" height="154" rx="10" fill="#065f46"/>
    <text x="22" y="48" fill="#d1fae5" font-family="Arial, sans-serif" font-size="18" font-weight="700">Commit</text>
    <text x="22" y="108" fill="#ecfdf5" font-family="Arial, sans-serif" font-size="54" font-weight="700">${commit}</text>
  </g>
  <g transform="translate(270 158)">
    <rect width="190" height="154" rx="10" fill="#7c2d12"/>
    <text x="22" y="48" fill="#fed7aa" font-family="Arial, sans-serif" font-size="18" font-weight="700">Metadata</text>
    <text x="22" y="108" fill="#fff7ed" font-family="Arial, sans-serif" font-size="54" font-weight="700">${metadata}</text>
  </g>
  <g transform="translate(492 158)">
    <rect width="190" height="154" rx="10" fill="#854d0e"/>
    <text x="22" y="48" fill="#fef3c7" font-family="Arial, sans-serif" font-size="18" font-weight="700">Resume Hold</text>
    <text x="22" y="108" fill="#fffbeb" font-family="Arial, sans-serif" font-size="54" font-weight="700">${resume}</text>
  </g>
  <g transform="translate(714 158)">
    <rect width="190" height="154" rx="10" fill="#991b1b"/>
    <text x="22" y="48" fill="#fee2e2" font-family="Arial, sans-serif" font-size="18" font-weight="700">Abort</text>
    <text x="22" y="108" fill="#fef2f2" font-family="Arial, sans-serif" font-size="54" font-weight="700">${abort}</text>
  </g>
  <text x="48" y="382" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="22">Checks: contiguous chunks, checksum evidence, manifest hash, metadata schema, expiry</text>
  <text x="48" y="424" fill="#d1d5db" font-family="Arial, sans-serif" font-size="18">Reviewer findings: ${findings}. Outputs: JSON packet, Markdown report, SVG summary, MP4 artifact.</text>
  <text x="48" y="478" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">Synthetic data only. No private datasets, credentials, storage provider calls, or network access.</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'upload-checkpoint-packet.json'), `${packetJson}\n`);
fs.writeFileSync(path.join(reportsDir, 'checkpoint-report.md'), reviewerReport);
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), svg);

console.log(`Wrote ${evaluations.length} upload checkpoint evaluations to ${reportsDir}`);
console.log(`Decision counts: commit=${commit}, metadata=${metadata}, resume=${resume}, abort=${abort}`);
console.log(`Reviewer findings: ${findings}`);
