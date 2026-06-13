const fs = require('fs');
const path = require('path');

const { assessExternalReferences } = require('./index');
const {
  riskyRepository,
  cleanRepository,
  warningRepository,
  malformedRepository,
  malformedManifestRepository,
  missingIdentityRepository,
  malformedRepositoryPacket,
  missingAssessmentTimestampRepository
} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const packets = [
  ['blocked-packet.json', assessExternalReferences(riskyRepository)],
  ['malformed-repository-packet.json', assessExternalReferences(malformedRepositoryPacket)],
  ['malformed-manifest-packet.json', assessExternalReferences(malformedManifestRepository)],
  ['malformed-packet.json', assessExternalReferences(malformedRepository)],
  ['missing-reference-id-packet.json', assessExternalReferences(missingIdentityRepository)],
  ['missing-assessed-at-packet.json', assessExternalReferences(missingAssessmentTimestampRepository)],
  ['clean-packet.json', assessExternalReferences(cleanRepository)],
  ['warning-packet.json', assessExternalReferences(warningRepository)]
];

for (const [fileName, packet] of packets) {
  fs.writeFileSync(path.join(reportsDir, fileName), `${JSON.stringify(packet, null, 2)}\n`);
  console.log(`${fileName}: ${packet.status}; findings=${packet.findings.length}; digest=${packet.auditDigest.slice(0, 12)}`);
}

const markdown = [
  '# Repository External Reference Pin Guard Report',
  '',
  '| Packet | Status | DOI publication | Export bundle | API access | Findings |',
  '| --- | --- | --- | --- | --- | --- |',
  ...packets.map(([fileName, packet]) => `| ${fileName} | ${packet.status} | ${packet.releaseLanes.doiPublication} | ${packet.releaseLanes.exportBundle} | ${packet.releaseLanes.apiAccess} | ${packet.findings.map((finding) => finding.code).join(', ') || 'none'} |`),
  '',
  'Synthetic data only. No external repositories, APIs, DOI registries, or private data sources are contacted.'
].join('\n');
fs.writeFileSync(path.join(reportsDir, 'external-reference-report.md'), `${markdown}\n`);

const rows = packets.map(([fileName, packet], index) => {
  const y = 94 + index * 68;
  const color = packet.status === 'hold_repository_release' ? '#b91c1c' : packet.status === 'stage_reference_metadata_revision' ? '#a16207' : '#047857';
  return `
      <g transform="translate(48 ${y})">
        <rect width="1104" height="52" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
        <circle cx="28" cy="26" r="11" fill="${color}"/>
        <text x="58" y="22" font-size="18" font-family="Arial" fill="#111827">${packet.repositoryId}</text>
        <text x="58" y="41" font-size="13" font-family="Arial" fill="#475569">${fileName} | findings ${packet.findings.length} | digest ${packet.auditDigest.slice(0, 16)}</text>
      </g>`;
}).join('');

const svgHeight = 140 + packets.length * 68;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${svgHeight}" viewBox="0 0 1200 ${svgHeight}">
  <rect width="1200" height="${svgHeight}" fill="#ffffff"/>
  <text x="48" y="48" font-size="28" font-family="Arial" font-weight="700" fill="#111827">Repository External Reference Pin Guard</text>
  <text x="48" y="74" font-size="15" font-family="Arial" fill="#475569">Issue #10 release/export gate for submodules, linked datasets, API sources, and model references</text>
${rows}
</svg>
`;
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), svg);
