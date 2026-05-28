const fs = require('fs');
const path = require('path');

const {
  buildExportPacket,
  reviewExportCommentPrivacy
} = require('./index');

const ROOT = __dirname;
const REPORTS = path.join(ROOT, 'reports');
fs.mkdirSync(REPORTS, { recursive: true });

const workspace = {
  id: 'collab-editor-demo-12',
  title: 'Quantum Materials Draft',
  invitedReviewerIds: ['rv-alpha', 'rv-beta'],
  exportProfiles: {
    publicPdf: { allowedVisibilities: ['public'], requireResolvedThreads: true },
    reviewerPackage: { allowedVisibilities: ['public', 'reviewer-only'], requireResolvedThreads: false }
  },
  documents: [
    {
      id: 'public-ready',
      exportProfile: 'publicPdf',
      threads: [
        {
          id: 'th-ready',
          visibility: 'public',
          resolved: true,
          mentions: ['rv-alpha'],
          text: 'Clarify method wording before public release.'
        }
      ],
      inlineAnnotations: [{ kind: 'public-note', text: 'Visible caption note.' }],
      redactionEvidence: ['public-comment-scan']
    },
    {
      id: 'public-hold',
      exportProfile: 'publicPdf',
      threads: [
        {
          id: 'th-private',
          visibility: 'private',
          resolved: false,
          mentions: ['rv-gamma'],
          text: 'Do not publish reviewer phone +1 555 010 3311 or delta@private.example'
        }
      ],
      inlineAnnotations: [{ kind: 'sensitive-inline', text: 'Embargo note.' }],
      redactionEvidence: []
    },
    {
      id: 'reviewer-ready',
      exportProfile: 'reviewerPackage',
      threads: [
        {
          id: 'th-reviewer',
          visibility: 'reviewer-only',
          resolved: false,
          mentions: ['rv-alpha'],
          text: 'Reviewer package can retain this note.'
        }
      ],
      inlineAnnotations: [],
      redactionEvidence: ['reviewer-package-scan']
    }
  ]
};

function markdownReport(packet) {
  const lines = [
    '# Collaborative Private Comment Export Guard',
    '',
    `Workspace: ${packet.title}`,
    `Digest: ${packet.digest}`,
    '',
    '## Summary',
    '',
    `- Ready exports: ${packet.summary.ready}`,
    `- Held exports: ${packet.summary.hold}`,
    '',
    '## Documents'
  ];

  for (const document of packet.documents) {
    lines.push('', `### ${document.documentId}`, '');
    lines.push(`- Export profile: ${document.exportProfile}`);
    lines.push(`- Decision: ${document.decision}`);
    lines.push(`- Threads: ${document.metrics.threadCount}`);
    lines.push(`- Private threads: ${document.metrics.privateThreadCount}`);
    lines.push(`- Holds: ${document.holds.join(', ') || 'none'}`);
    lines.push(`- Redacted thread count: ${document.redactedThreadText.length}`);
  }

  return `${lines.join('\n')}\n`;
}

function svgSummary(packet) {
  const rows = packet.documents
    .map((document, index) => {
      const y = 168 + index * 68;
      const color = document.decision === 'ready' ? '#22c55e' : '#ef4444';
      return [
        `<rect x="70" y="${y}" width="1020" height="46" rx="12" fill="#111827" stroke="${color}" stroke-width="3"/>`,
        `<text x="96" y="${y + 30}" fill="#e5e7eb" font-size="21">${document.documentId}: ${document.decision}</text>`,
        `<text x="590" y="${y + 30}" fill="#cbd5e1" font-size="18">holds ${document.holds.length} | private ${document.metrics.privateThreadCount}</text>`
      ].join('\n');
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="420" viewBox="0 0 1160 420">
  <rect width="1160" height="420" fill="#0f172a"/>
  <text x="70" y="75" fill="#f8fafc" font-size="36" font-family="Arial">Private Comment Export Guard</text>
  <text x="70" y="120" fill="#bae6fd" font-size="22" font-family="Arial">Ready ${packet.summary.ready} | Hold ${packet.summary.hold}</text>
  ${rows}
</svg>
`;
}

const review = reviewExportCommentPrivacy(workspace);
const packet = buildExportPacket(workspace, review);

fs.writeFileSync(path.join(REPORTS, 'readiness-report.json'), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(REPORTS, 'readiness-report.md'), markdownReport(packet));
fs.writeFileSync(path.join(REPORTS, 'readiness-summary.svg'), svgSummary(packet));

console.log(JSON.stringify(packet.summary));
