const fs = require('fs');
const path = require('path');

const {
  buildReviewerPacket,
  reviewQualitativeReadiness
} = require('./index');

const ROOT = __dirname;
const REPORTS = path.join(ROOT, 'reports');
fs.mkdirSync(REPORTS, { recursive: true });

const study = {
  id: 'qualitative-ai-assistant-demo',
  title: 'Remote Lab Onboarding Interviews',
  minimumCoderAgreement: 0.72,
  minimumSaturationRounds: 2,
  requiredDomains: ['onboarding', 'tooling', 'data-sharing', 'mentorship'],
  consentedTranscriptIds: ['tx-001', 'tx-002', 'tx-003', 'tx-004'],
  submissions: [
    {
      id: 'ready-pack',
      team: { id: 'team-indigo', contactEmail: 'indigo.lab@example.edu' },
      codebook: [
        { code: 'onboarding-friction', domain: 'onboarding', examples: 4 },
        { code: 'tool-handoff', domain: 'tooling', examples: 5 },
        { code: 'dataset-ownership', domain: 'data-sharing', examples: 3 },
        { code: 'mentor-access', domain: 'mentorship', examples: 3 }
      ],
      transcriptIds: ['tx-001', 'tx-002', 'tx-003', 'tx-004'],
      coderAgreement: 0.81,
      saturationRounds: 3,
      reflexivityMemo: 'Interviewers documented role distance and prior collaboration history.',
      memberChecking: { completed: true, unresolvedObjections: 0 },
      auditTrail: ['protocol-v1', 'codebook-v2', 'negative-case-review'],
      rawTranscriptQuotes: ['Participant A: alpha@private.example asked for access.']
    },
    {
      id: 'hold-pack',
      team: { id: 'team-cobalt', contactEmail: 'cobalt.lab@example.edu' },
      codebook: [
        { code: 'onboarding-friction', domain: 'onboarding', examples: 3 },
        { code: 'tool-handoff', domain: 'tooling', examples: 4 }
      ],
      transcriptIds: ['tx-001', 'tx-999'],
      coderAgreement: 0.61,
      saturationRounds: 1,
      reflexivityMemo: '',
      memberChecking: { completed: false, unresolvedObjections: 2 },
      auditTrail: ['protocol-v1'],
      rawTranscriptQuotes: ['Participant C shared a private phone number 555-010-8899.']
    }
  ]
};

function markdownReport(packet) {
  const lines = [
    '# Qualitative Codebook Saturation Assistant',
    '',
    `Study: ${packet.title}`,
    `Digest: ${packet.digest}`,
    '',
    '## Summary',
    '',
    `- Ready packets: ${packet.summary.ready}`,
    `- Held packets: ${packet.summary.hold}`,
    '',
    '## Reviews'
  ];

  for (const review of packet.reviews) {
    lines.push('', `### ${review.submissionId}`, '');
    lines.push(`- Decision: ${review.decision}`);
    lines.push(`- Coder agreement: ${review.metrics.coderAgreement}`);
    lines.push(`- Saturation rounds: ${review.metrics.saturationRounds}`);
    lines.push(`- Coded domains: ${review.metrics.codedDomains.join(', ') || 'none'}`);
    lines.push(`- Holds: ${review.holds.join(', ') || 'none'}`);
    lines.push(`- Redacted quote count: ${review.redactedQuotes.length}`);
  }

  return `${lines.join('\n')}\n`;
}

function svgSummary(packet) {
  const rows = packet.reviews
    .map((review, index) => {
      const y = 170 + index * 78;
      const color = review.decision === 'ready' ? '#22c55e' : '#f97316';
      return [
        `<rect x="70" y="${y}" width="1020" height="52" rx="12" fill="#111827" stroke="${color}" stroke-width="3"/>`,
        `<text x="96" y="${y + 33}" fill="#e5e7eb" font-size="22">${review.submissionId}: ${review.decision}</text>`,
        `<text x="590" y="${y + 33}" fill="#cbd5e1" font-size="18">holds ${review.holds.length} | agreement ${review.metrics.coderAgreement}</text>`
      ].join('\n');
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="420" viewBox="0 0 1160 420">
  <rect width="1160" height="420" fill="#0f172a"/>
  <text x="70" y="75" fill="#f8fafc" font-size="36" font-family="Arial">Qualitative Readiness Guard</text>
  <text x="70" y="120" fill="#bae6fd" font-size="22" font-family="Arial">Ready ${packet.summary.ready} | Hold ${packet.summary.hold}</text>
  ${rows}
</svg>
`;
}

const review = reviewQualitativeReadiness(study);
const packet = buildReviewerPacket(study, review);

fs.writeFileSync(path.join(REPORTS, 'readiness-report.json'), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(REPORTS, 'readiness-report.md'), markdownReport(packet));
fs.writeFileSync(path.join(REPORTS, 'readiness-summary.svg'), svgSummary(packet));

console.log(JSON.stringify(packet.summary));
