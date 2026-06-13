const fs = require('fs');
const path = require('path');

const { assessImportBatch } = require('./index');
const {
  unsafeClipboardImport,
  partnerForwardImport,
  trustedMissingAttestationImport,
  trustedPlaceholderAttestationImport,
  unsupportedChannelImport,
  malformedBlockListImport,
  malformedBlockEntryImport,
  malformedTableRowImport,
  malformedTableCellsImport,
  malformedExistingAnchorsImport,
  duplicateAnchorMissingIdsImport,
  cleanTrustedImport,
  privateSourceOriginImport,
  lowercaseWindowsPathImport,
  forwardSlashWindowsPathImport
} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const packets = [
  ['unsafe-packet.json', assessImportBatch(unsafeClipboardImport)],
  ['partner-review-packet.json', assessImportBatch(partnerForwardImport)],
  ['trusted-attestation-packet.json', assessImportBatch(trustedMissingAttestationImport)],
  ['placeholder-attestation-packet.json', assessImportBatch(trustedPlaceholderAttestationImport)],
  ['unsupported-channel-packet.json', assessImportBatch(unsupportedChannelImport)],
  ['malformed-import-batch-packet.json', assessImportBatch(null)],
  ['malformed-block-list-packet.json', assessImportBatch(malformedBlockListImport)],
  ['malformed-block-entry-packet.json', assessImportBatch(malformedBlockEntryImport)],
  ['malformed-table-row-packet.json', assessImportBatch(malformedTableRowImport)],
  ['malformed-table-cells-packet.json', assessImportBatch(malformedTableCellsImport)],
  ['malformed-existing-anchors-packet.json', assessImportBatch(malformedExistingAnchorsImport)],
  ['missing-block-ids-anchor-collision-packet.json', assessImportBatch(duplicateAnchorMissingIdsImport)],
  ['source-origin-packet.json', assessImportBatch(privateSourceOriginImport)],
  ['lowercase-windows-path-packet.json', assessImportBatch(lowercaseWindowsPathImport)],
  ['forward-slash-windows-path-packet.json', assessImportBatch(forwardSlashWindowsPathImport)],
  ['clean-packet.json', assessImportBatch(cleanTrustedImport)]
];

for (const [fileName, packet] of packets) {
  fs.writeFileSync(path.join(reportsDir, fileName), `${JSON.stringify(packet, null, 2)}\n`);
}

fs.writeFileSync(path.join(reportsDir, 'import-provenance-report.md'), renderMarkdown(packets));
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), renderSvg(packets));

for (const [fileName, packet] of packets) {
  console.log(`${fileName}: ${packet.status}; findings=${packet.findings.length}; digest=${packet.auditDigest.slice(0, 12)}`);
}

function renderMarkdown(packetRows) {
  const lines = [
    '# Collaborative Clipboard Import Provenance Report',
    '',
    '| Packet | Status | Collaborative insert | Reviewer preview | Retention | Findings |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const [fileName, packet] of packetRows) {
    lines.push([
      fileName,
      packet.status,
      packet.insertionLanes.collaborativeInsert,
      packet.insertionLanes.reviewerPreview,
      packet.insertionLanes.auditRetention,
      packet.findings.map((finding) => finding.code).join(', ') || 'none'
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('');
  lines.push('All packets use synthetic import payloads and deterministic SHA-256 audit digests.');
  lines.push('The guard runs before pasted or imported blocks become visible in a shared manuscript session.');
  return `${lines.join('\n')}\n`;
}

function renderSvg(packetRows) {
  const height = 108 + packetRows.length * 74 + 54;
  const rows = packetRows.map(([, packet], index) => {
    const y = 108 + index * 74;
    const color = packet.status === 'quarantine_import' ? '#b91c1c' : packet.status === 'stage_for_curator_review' ? '#b45309' : '#15803d';
    return `
      <g transform="translate(48 ${y})">
        <rect width="1104" height="52" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
        <circle cx="28" cy="26" r="11" fill="${color}"/>
        <text x="58" y="22" font-size="18" font-family="Arial" fill="#111827">${escapeXml(packet.importId)}</text>
        <text x="58" y="41" font-size="13" font-family="Arial" fill="#475569">${escapeXml(packet.status)} | findings ${packet.findings.length} | digest ${packet.auditDigest.slice(0, 16)}</text>
      </g>`;
  }).join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">`,
    `  <rect width="1200" height="${height}" fill="#eef2f7"/>`,
    '  <text x="48" y="52" font-size="31" font-family="Arial" font-weight="700" fill="#111827">Clipboard Import Provenance Guard</text>',
    '  <text x="48" y="80" font-size="16" font-family="Arial" fill="#374151">Pasted and imported research-editor blocks are gated before collaborative insertion.</text>',
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
