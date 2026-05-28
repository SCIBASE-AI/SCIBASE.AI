const fs = require('fs');
const path = require('path');

const { assessNotebookOutputPacket } = require('./index');
const { cleanPacket, unsafePacket, warningPacket } = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const unsafeReview = assessNotebookOutputPacket(unsafePacket);
const warningReview = assessNotebookOutputPacket(warningPacket);
const cleanReview = assessNotebookOutputPacket(cleanPacket);

writeJson('unsafe-notebook-packet.json', unsafeReview);
writeJson('warning-notebook-packet.json', warningReview);
writeJson('clean-notebook-packet.json', cleanReview);
writeMarkdownReport(unsafeReview, warningReview, cleanReview);
writeMaintainerVerificationPacket(unsafeReview, warningReview, cleanReview);
writeSummarySvg(unsafeReview, warningReview, cleanReview);

console.log('Generated notebook reproducibility artifacts:');
console.log(`- ${path.join(reportsDir, 'unsafe-notebook-packet.json')}`);
console.log(`- ${path.join(reportsDir, 'warning-notebook-packet.json')}`);
console.log(`- ${path.join(reportsDir, 'clean-notebook-packet.json')}`);
console.log(`- ${path.join(reportsDir, 'notebook-reproducibility-report.md')}`);
console.log(`- ${path.join(reportsDir, 'maintainer-verification-packet.md')}`);
console.log(`- ${path.join(reportsDir, 'summary.svg')}`);

function writeJson(filename, value) {
  fs.writeFileSync(path.join(reportsDir, filename), `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdownReport(unsafeReview, warningReview, cleanReview) {
  const lines = [
    '# Collaborative Notebook Reproducibility Guard',
    '',
    'Synthetic demo packet review for issue #12.',
    '',
    '| Packet | Status | Cells | Blockers | Warnings | Action |',
    '| --- | --- | ---: | ---: | ---: | --- |',
    row('Unsafe packet', unsafeReview),
    row('Warning packet', warningReview),
    row('Clean packet', cleanReview),
    '',
    '## Reviewer Notes',
    '',
    '- Unsafe packets are held before shared manuscript insertion.',
    '- Rich HTML outputs are sanitized and local/private paths are redacted.',
    '- Clean continuous reruns with runtime, seed, dependency lock, and input fingerprints are accepted.'
  ];

  fs.writeFileSync(path.join(reportsDir, 'notebook-reproducibility-report.md'), `${lines.join('\n')}\n`);
}

function row(label, packet) {
  const summary = packet.reproducibilitySummary;
  return `| ${label} | ${packet.status} | ${summary.cells} | ${summary.blockers} | ${summary.warnings} | ${primaryAction(packet)} |`;
}

function writeMaintainerVerificationPacket(unsafeReview, warningReview, cleanReview) {
  const blockerCodes = unsafeReview.findings
    .filter((finding) => finding.severity === 'blocker')
    .map((finding) => finding.code);
  const sanitizedLoadCell = unsafeReview.cells.find((cell) => cell.id === 'cell-load-data');
  const sanitizedModelCell = unsafeReview.cells.find((cell) => cell.id === 'cell-fit-model');
  const lines = [
    '# Maintainer Verification Packet',
    '',
    'This packet gives reviewers a compact checklist for issue #12 acceptance.',
    '',
    '## Acceptance Evidence',
    '',
    `- Unsafe packet lane: ${unsafeReview.status}`,
    `- Warning packet lane: ${warningReview.status}`,
    `- Clean packet lane: ${cleanReview.status}`,
    `- Unsafe blocker count: ${unsafeReview.reproducibilitySummary.blockers}`,
    `- Warning count: ${warningReview.reproducibilitySummary.warnings}`,
    `- Clean accepted cells: ${cleanReview.reproducibilitySummary.cells}`,
    '',
    '## Guard Coverage',
    '',
    '| Requirement | Evidence |',
    '| --- | --- |',
    `| Execution-order continuity | ${blockerCodes.includes('EXECUTION_ORDER_GAP') ? 'covered by unsafe packet' : 'missing'} |`,
    `| Dependency/version integrity | ${blockerCodes.includes('DEPENDENCY_LOCK_MISMATCH') ? 'covered by unsafe packet' : 'missing'} |`,
    `| Random-seed capture | ${blockerCodes.includes('MISSING_RANDOM_SEED') ? 'covered by unsafe packet' : 'missing'} |`,
    `| Input artifact fingerprints | ${blockerCodes.includes('MISSING_INPUT_FINGERPRINT') ? 'covered by unsafe packet' : 'missing'} |`,
    `| Stale output detection | ${blockerCodes.includes('STALE_NOTEBOOK_OUTPUT') ? 'covered by unsafe packet' : 'missing'} |`,
    `| Section-version drift | ${blockerCodes.includes('SECTION_VERSION_MISMATCH') ? 'covered by unsafe packet' : 'missing'} |`,
    `| Rich HTML sanitization | ${sanitizedModelCell?.outputs?.[0]?.trusted === false ? 'sanitized and marked untrusted' : 'missing'} |`,
    `| Private path redaction | ${/\[redacted-local-path]/.test(sanitizedLoadCell?.outputs?.[0]?.content || '') ? 'redacted in output packet' : 'missing'} |`,
    '',
    '## Deterministic Digests',
    '',
    `- Unsafe packet digest: ${unsafeReview.auditDigest}`,
    `- Warning packet digest: ${warningReview.auditDigest}`,
    `- Clean packet digest: ${cleanReview.auditDigest}`,
    '',
    '## Local Command',
    '',
    '```bash',
    'npm run check',
    '```'
  ];

  fs.writeFileSync(path.join(reportsDir, 'maintainer-verification-packet.md'), `${lines.join('\n')}\n`);
}

function primaryAction(packet) {
  return (
    packet.actions.find((action) => action.startsWith('hold_notebook_outputs')) ||
    packet.actions.find((action) => action.startsWith('accept_notebook_outputs')) ||
    packet.actions[0]
  );
}

function writeSummarySvg(unsafeReview, warningReview, cleanReview) {
  const cards = [
    { label: 'Unsafe', packet: unsafeReview, color: '#b91c1c', x: 28 },
    { label: 'Warning', packet: warningReview, color: '#b45309', x: 318 },
    { label: 'Clean', packet: cleanReview, color: '#047857', x: 608 }
  ];

  const cardSvg = cards.map(({ label, packet, color, x }) => {
    const summary = packet.reproducibilitySummary;
    return [
      `<rect x="${x}" y="92" width="244" height="172" rx="10" fill="#ffffff" stroke="${color}" stroke-width="3"/>`,
      `<text x="${x + 22}" y="130" font-size="24" font-family="Arial" font-weight="700" fill="${color}">${label}</text>`,
      `<text x="${x + 22}" y="165" font-size="15" font-family="Arial" fill="#111827">${escapeXml(packet.status)}</text>`,
      `<text x="${x + 22}" y="202" font-size="15" font-family="Arial" fill="#374151">Cells: ${summary.cells}</text>`,
      `<text x="${x + 22}" y="226" font-size="15" font-family="Arial" fill="#374151">Blockers: ${summary.blockers}</text>`,
      `<text x="${x + 22}" y="250" font-size="15" font-family="Arial" fill="#374151">Warnings: ${summary.warnings}</text>`
    ].join('\n');
  }).join('\n');

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="880" height="320" viewBox="0 0 880 320">',
    '<rect width="880" height="320" fill="#f8fafc"/>',
    '<text x="28" y="48" font-size="28" font-family="Arial" font-weight="700" fill="#0f172a">Notebook Output Reproducibility Guard</text>',
    '<text x="28" y="74" font-size="15" font-family="Arial" fill="#475569">Pre-acceptance validation for collaborative Jupyter-style output packets</text>',
    cardSvg,
    '</svg>'
  ].join('\n');

  fs.writeFileSync(path.join(reportsDir, 'summary.svg'), `${svg}\n`);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
