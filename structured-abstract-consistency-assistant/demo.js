const fs = require('fs');
const path = require('path');

const { assessStructuredAbstract } = require('./index');
const {
  blockedManuscript,
  revisionManuscript,
  negatedDesignManuscript,
  negatedPrimaryEndpointManuscript,
  missingSourceEvidenceManuscript,
  resultCertaintyOverclaimManuscript,
  mixedCertaintyOverclaimManuscript,
  conclusionCertaintyOverclaimManuscript,
  weakLimitationHedgeManuscript,
  percentageSampleSizeManuscript,
  decimalSampleSizeManuscript,
  durationSampleSizeManuscript,
  abbreviatedUnitSampleSizeManuscript,
  hyphenatedMeasurementSampleSizeManuscript,
  ordinalSampleSizeManuscript,
  noDifferenceOutcomeManuscript,
  missingResultsEndpointManuscript,
  missingMethodsEndpointManuscript,
  sourceEndpointMismatchManuscript,
  malformedManuscript,
  invalidAssessmentTimestampManuscript,
  impossibleAssessmentTimestampManuscript,
  cleanManuscript
} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const packets = [
  ['blocked-packet.json', assessStructuredAbstract(blockedManuscript)],
  ['revision-packet.json', assessStructuredAbstract(revisionManuscript)],
  ['negated-design-packet.json', assessStructuredAbstract(negatedDesignManuscript)],
  ['negated-primary-endpoint-packet.json', assessStructuredAbstract(negatedPrimaryEndpointManuscript)],
  ['missing-source-evidence-packet.json', assessStructuredAbstract(missingSourceEvidenceManuscript)],
  ['result-certainty-packet.json', assessStructuredAbstract(resultCertaintyOverclaimManuscript)],
  ['mixed-certainty-packet.json', assessStructuredAbstract(mixedCertaintyOverclaimManuscript)],
  ['conclusion-certainty-packet.json', assessStructuredAbstract(conclusionCertaintyOverclaimManuscript)],
  ['weak-limitation-packet.json', assessStructuredAbstract(weakLimitationHedgeManuscript)],
  ['percentage-sample-size-packet.json', assessStructuredAbstract(percentageSampleSizeManuscript)],
  ['decimal-sample-size-packet.json', assessStructuredAbstract(decimalSampleSizeManuscript)],
  ['duration-sample-size-packet.json', assessStructuredAbstract(durationSampleSizeManuscript)],
  ['abbreviated-unit-sample-size-packet.json', assessStructuredAbstract(abbreviatedUnitSampleSizeManuscript)],
  ['hyphenated-measurement-sample-size-packet.json', assessStructuredAbstract(hyphenatedMeasurementSampleSizeManuscript)],
  ['ordinal-sample-size-packet.json', assessStructuredAbstract(ordinalSampleSizeManuscript)],
  ['no-difference-outcome-packet.json', assessStructuredAbstract(noDifferenceOutcomeManuscript)],
  ['missing-results-endpoint-packet.json', assessStructuredAbstract(missingResultsEndpointManuscript)],
  ['missing-methods-endpoint-packet.json', assessStructuredAbstract(missingMethodsEndpointManuscript)],
  ['source-endpoint-mismatch-packet.json', assessStructuredAbstract(sourceEndpointMismatchManuscript)],
  ['malformed-manuscript-packet.json', assessStructuredAbstract(malformedManuscript)],
  ['invalid-assessed-at-packet.json', assessStructuredAbstract(invalidAssessmentTimestampManuscript)],
  ['impossible-assessed-at-packet.json', assessStructuredAbstract(impossibleAssessmentTimestampManuscript)],
  ['clean-packet.json', assessStructuredAbstract(cleanManuscript)]
];

for (const [fileName, packet] of packets) {
  fs.writeFileSync(path.join(reportsDir, fileName), `${JSON.stringify(packet, null, 2)}\n`);
}

fs.writeFileSync(path.join(reportsDir, 'abstract-consistency-report.md'), renderMarkdown(packets));
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), renderSvg(packets));

for (const [fileName, packet] of packets) {
  console.log(`${fileName}: ${packet.status}; findings=${packet.findings.length}; digest=${packet.auditDigest.slice(0, 12)}`);
}

function renderMarkdown(packetRows) {
  const lines = [
    '# Structured Abstract Consistency Report',
    '',
    '| Packet | Status | Author draft | AI peer review | Editor summary | Findings |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const [fileName, packet] of packetRows) {
    lines.push([
      fileName,
      packet.status,
      packet.reviewLanes.authorDraft,
      packet.reviewLanes.aiPeerReview,
      packet.reviewLanes.editorSummary,
      packet.findings.map((finding) => finding.code).join(', ') || 'none'
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('');
  lines.push('All packets use synthetic manuscript records and deterministic SHA-256 audit digests.');
  lines.push('The assistant runs before AI peer-review packets or editor summaries are shown.');
  return `${lines.join('\n')}\n`;
}

function renderSvg(packetRows) {
  const height = 108 + packetRows.length * 74 + 40;
  const rows = packetRows.map(([, packet], index) => {
    const y = 108 + index * 74;
    const color = packet.status === 'hold_peer_review_packet' ? '#b91c1c' : packet.status === 'stage_for_author_revision' ? '#b45309' : '#15803d';
    return `
      <g transform="translate(48 ${y})">
        <rect width="1104" height="52" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
        <circle cx="28" cy="26" r="11" fill="${color}"/>
        <text x="58" y="22" font-size="18" font-family="Arial" fill="#111827">${escapeXml(packet.manuscriptId)}</text>
        <text x="58" y="41" font-size="13" font-family="Arial" fill="#475569">${escapeXml(packet.status)} | findings ${packet.findings.length} | digest ${packet.auditDigest.slice(0, 16)}</text>
      </g>`;
  }).join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">`,
    `  <rect width="1200" height="${height}" fill="#eef2f7"/>`,
    '  <text x="48" y="52" font-size="31" font-family="Arial" font-weight="700" fill="#111827">Structured Abstract Consistency Assistant</text>',
    '  <text x="48" y="80" font-size="16" font-family="Arial" fill="#374151">Abstracts are checked against counts, methods, results, and limitations before AI review release.</text>',
    rows,
    '</svg>',
    ''
  ].join('\n');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
