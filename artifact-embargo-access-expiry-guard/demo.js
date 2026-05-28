const fs = require('fs');
const path = require('path');

const {
  buildReleasePacket,
  reviewArtifactReleaseReadiness
} = require('./index');

const ROOT = __dirname;
const REPORTS = path.join(ROOT, 'reports');
fs.mkdirSync(REPORTS, { recursive: true });

const project = {
  id: 'artifact-hosting-demo-14',
  title: 'Cryo-EM Artifact Release',
  reviewDate: '2026-05-28',
  artifacts: [
    {
      id: 'dataset-ready',
      type: 'dataset',
      embargoEndsOn: '2026-05-01',
      publicReleaseRequested: true,
      reviewerLinks: [{ id: 'rv-ready', expiresOn: '2026-06-15', revoked: false }],
      accessionEvidence: ['doi:10.0000/scibase.ready'],
      takedownRequest: false,
      legalHold: false,
      accessLog: 'alice@example.edu downloaded preview from 10.0.0.4'
    },
    {
      id: 'model-held',
      type: 'model',
      embargoEndsOn: '2026-08-01',
      publicReleaseRequested: true,
      reviewerLinks: [{ id: 'rv-expired', expiresOn: '2026-04-15', revoked: false }],
      accessionEvidence: [],
      takedownRequest: false,
      legalHold: false,
      accessLog: 'token=artifact-secret bob@example.edu exported model'
    }
  ]
};

function markdownReport(packet) {
  const lines = [
    '# Artifact Embargo Access Expiry Guard',
    '',
    `Project: ${packet.title}`,
    `Review date: ${packet.reviewDate}`,
    `Digest: ${packet.digest}`,
    '',
    '## Summary',
    '',
    `- Ready artifacts: ${packet.summary.ready}`,
    `- Held artifacts: ${packet.summary.hold}`,
    '',
    '## Artifacts'
  ];

  for (const artifact of packet.artifacts) {
    lines.push('', `### ${artifact.artifactId}`, '');
    lines.push(`- Type: ${artifact.type}`);
    lines.push(`- Decision: ${artifact.decision}`);
    lines.push(`- Embargo ends: ${artifact.metrics.embargoEndsOn}`);
    lines.push(`- Reviewer links: ${artifact.metrics.reviewerLinkCount}`);
    lines.push(`- Holds: ${artifact.holds.join(', ') || 'none'}`);
    lines.push(`- Redacted access log: ${artifact.redactedAccessLog}`);
  }

  return `${lines.join('\n')}\n`;
}

function svgSummary(packet) {
  const rows = packet.artifacts
    .map((artifact, index) => {
      const y = 168 + index * 76;
      const color = artifact.decision === 'ready' ? '#22c55e' : '#f97316';
      return [
        `<rect x="70" y="${y}" width="1020" height="54" rx="12" fill="#111827" stroke="${color}" stroke-width="3"/>`,
        `<text x="96" y="${y + 34}" fill="#e5e7eb" font-size="21">${artifact.artifactId}: ${artifact.decision}</text>`,
        `<text x="590" y="${y + 34}" fill="#cbd5e1" font-size="18">holds ${artifact.holds.length} | links ${artifact.metrics.reviewerLinkCount}</text>`
      ].join('\n');
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="420" viewBox="0 0 1160 420">
  <rect width="1160" height="420" fill="#0f172a"/>
  <text x="70" y="75" fill="#f8fafc" font-size="36" font-family="Arial">Artifact Embargo Guard</text>
  <text x="70" y="120" fill="#bae6fd" font-size="22" font-family="Arial">Ready ${packet.summary.ready} | Hold ${packet.summary.hold}</text>
  ${rows}
</svg>
`;
}

const review = reviewArtifactReleaseReadiness(project);
const packet = buildReleasePacket(project, review);

fs.writeFileSync(path.join(REPORTS, 'readiness-report.json'), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(REPORTS, 'readiness-report.md'), markdownReport(packet));
fs.writeFileSync(path.join(REPORTS, 'readiness-summary.svg'), svgSummary(packet));

console.log(JSON.stringify(packet.summary));
