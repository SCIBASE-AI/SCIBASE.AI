const fs = require('fs');
const path = require('path');

const {
  buildSafetyReviewPacket,
  reviewAdverseEventSafety
} = require('./index');

const sampleEmail = ['dana', 'example.edu'].join('@');
const sampleToken = ['clinical', 'demo'].join('-');

const manuscript = {
  id: 'clinic-ae-demo-16',
  title: 'Phase II kinase inhibitor safety manuscript',
  reviewDate: '2026-05-28',
  arms: [
    {
      id: 'control',
      label: 'Control',
      participants: 120,
      exposurePatientYears: 92,
      events: [
        { term: 'headache', grade: 1, count: 14, participantsAtRisk: 120 },
        { term: 'neutropenia', grade: 3, count: 2, participantsAtRisk: 120 }
      ],
      seriousAdverseEvents: 1,
      reportedSeriousAdverseEvents: 1
    },
    {
      id: 'treatment',
      label: 'Treatment',
      participants: 118,
      exposurePatientYears: 88,
      events: [
        { term: 'hepatotoxicity', grade: 4, count: 8, participantsAtRisk: 118 },
        { term: 'infection', grade: 3, count: 7 },
        { term: 'fatigue', grade: 2, count: 19, participantsAtRisk: 118 }
      ],
      seriousAdverseEvents: 6,
      reportedSeriousAdverseEvents: 2
    }
  ],
  claims: [
    {
      id: 'claim-safe',
      text: 'No meaningful safety concerns were observed and all adverse events were grade 2 or lower.',
      linkedEventTerms: ['hepatotoxicity', 'infection']
    }
  ],
  oversight: {
    dsmbReviewLinked: false,
    irbFollowUpStatus: 'pending',
    auditLog: `reviewer ${sampleEmail} noted token=${sampleToken} before DSMB review`
  }
};

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const review = reviewAdverseEventSafety(manuscript);
const packet = buildSafetyReviewPacket(manuscript, review);

fs.writeFileSync(
  path.join(reportsDir, 'safety-review.json'),
  `${JSON.stringify(packet, null, 2)}\n`
);

const markdown = [
  '# Clinical Adverse-Event Safety Review',
  '',
  `Decision: ${packet.summary.decision}`,
  `Findings: ${packet.summary.findings}`,
  `Digest: ${packet.digest}`,
  '',
  '## Findings',
  ...packet.findings.map(
    (finding) => `- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`
  ),
  '',
  '## Required actions',
  ...packet.actions.map((action) => `- ${action}`),
  ''
].join('\n');

fs.writeFileSync(path.join(reportsDir, 'safety-review.md'), markdown);

const svgRows = packet.findings
  .slice(0, 7)
  .map((finding, index) => {
    const y = 176 + index * 48;
    return [
      `<rect x="64" y="${y - 25}" width="1010" height="36" rx="8" fill="#fff7ed" stroke="#fdba74"/>`,
      `<text x="84" y="${y}" font-family="Arial" font-size="18" fill="#7c2d12">${finding.code}: ${finding.action}</text>`
    ].join('\n');
  })
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="620" viewBox="0 0 1160 620">
  <rect width="1160" height="620" fill="#f8fafc"/>
  <rect x="40" y="40" width="1080" height="540" rx="16" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
  <text x="64" y="92" font-family="Arial" font-size="34" font-weight="700" fill="#0f172a">Clinical adverse-event safety assistant</text>
  <text x="64" y="126" font-family="Arial" font-size="20" fill="#475569">Issue #16 AI-Powered Research Assistant Suite - synthetic reviewer packet</text>
  <text x="64" y="156" font-family="Arial" font-size="22" fill="#b91c1c">Decision: HOLD until safety evidence is reconciled</text>
  ${svgRows}
  <text x="64" y="558" font-family="Arial" font-size="18" fill="#475569">Digest: ${packet.digest}</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, 'safety-review.svg'), svg);

console.log(`Wrote reports for ${packet.manuscriptId}`);
