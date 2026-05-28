const fs = require('fs');
const path = require('path');

const {
  buildSponsorPacket,
  reviewChallengeDataUseReadiness
} = require('./index');

const challenge = {
  id: 'scibase-challenge-18-dua-demo',
  title: 'Controlled Omics Benchmark Challenge',
  controlledDatasets: [
    {
      id: 'public-baseline',
      tier: 'open',
      permittedUses: ['whitepaper', 'model-training'],
      retentionDays: 365
    },
    {
      id: 'controlled-omics',
      tier: 'controlled',
      duaId: 'DUA-OMICS-2026',
      permittedUses: ['model-training', 'whitepaper'],
      retentionDays: 30,
      exportControlled: false
    },
    {
      id: 'restricted-assay-panel',
      tier: 'restricted',
      duaId: 'DUA-ASSAY-2026',
      permittedUses: ['whitepaper'],
      retentionDays: 14,
      exportControlled: true
    }
  ],
  submissions: [
    {
      id: 'submission-green',
      team: { id: 'lab-green', contactEmail: 'green.lab@example.edu' },
      datasetUses: [{ datasetId: 'controlled-omics', use: 'model-training', daysHeld: 12 }],
      agreements: [{ datasetId: 'controlled-omics', duaId: 'DUA-OMICS-2026', active: true }],
      exportClearances: [],
      artifacts: [{ name: 'model-card.md', containsControlledRows: false }],
      sponsorReviewRequested: true,
      payoutRequested: true,
      ipTransferRequested: true
    },
    {
      id: 'submission-hold',
      team: { id: 'lab-hold', contactEmail: 'hold.lab@example.edu' },
      datasetUses: [{ datasetId: 'controlled-omics', use: 'public-release', daysHeld: 41 }],
      agreements: [],
      exportClearances: [],
      artifacts: [{ name: 'derived-table.csv', containsControlledRows: true }],
      sponsorReviewRequested: true,
      payoutRequested: true,
      ipTransferRequested: true
    },
    {
      id: 'submission-compliance',
      team: { id: 'lab-export', contactEmail: 'export.lab@example.edu' },
      datasetUses: [{ datasetId: 'restricted-assay-panel', use: 'whitepaper', daysHeld: 5 }],
      agreements: [{ datasetId: 'restricted-assay-panel', duaId: 'DUA-ASSAY-2026', active: true }],
      exportClearances: [],
      artifacts: [{ name: 'whitepaper.pdf', containsControlledRows: false }],
      sponsorReviewRequested: true,
      payoutRequested: true,
      ipTransferRequested: false
    }
  ]
};

function markdownFor(result, packet) {
  const rows = result.submissionReviews
    .map(
      (review) =>
        `| ${review.submissionId} | ${review.decision} | ${review.releaseGates.sponsorReview} | ${review.releaseGates.payout} | ${review.holds.join(', ') || 'none'} |`
    )
    .join('\n');

  return [
    '# Challenge Data-Use Agreement Guard Demo',
    '',
    `Challenge: ${result.title}`,
    `Audit digest: ${result.auditDigest}`,
    '',
    '| Submission | Decision | Sponsor review | Payout | Holds |',
    '| --- | --- | --- | --- | --- |',
    rows,
    '',
    'Sponsor packet redacts direct team contacts:',
    '',
    '```json',
    JSON.stringify(packet.submissions.map(({ submissionId, teamContact }) => ({ submissionId, teamContact })), null, 2),
    '```'
  ].join('\n');
}

function svgFor(result) {
  const width = 960;
  const height = 520;
  const bars = [
    ['ready', '#36d399'],
    ['hold', '#fb7185'],
    ['manual-review', '#fbbf24']
  ];

  const barSvg = bars
    .map(([key, color], index) => {
      const count = result.summary[key];
      const x = 120 + index * 260;
      const barHeight = 70 + count * 70;
      const y = 390 - barHeight;
      return [
        `<rect x="${x}" y="${y}" width="130" height="${barHeight}" rx="10" fill="${color}" />`,
        `<text x="${x + 65}" y="${y - 18}" text-anchor="middle" font-size="28" fill="#e5e7eb">${count}</text>`,
        `<text x="${x + 65}" y="430" text-anchor="middle" font-size="22" fill="#cbd5e1">${key}</text>`
      ].join('\n  ');
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#101827"/>
  <text x="60" y="78" font-size="38" font-family="Arial" fill="#ffffff">Challenge Data-Use Agreement Guard</text>
  <text x="60" y="122" font-size="22" font-family="Arial" fill="#9fb3c8">Sponsor review and payout gates for controlled scientific bounty materials</text>
  ${barSvg}
  <text x="60" y="485" font-size="18" font-family="Arial" fill="#9fb3c8">Synthetic data only. Contacts redacted before sponsor packet release.</text>
</svg>`;
}

function main() {
  const result = reviewChallengeDataUseReadiness(challenge);
  const packet = buildSponsorPacket(challenge, result);
  const reportsDir = path.join(__dirname, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'readiness-report.json'), JSON.stringify({ result, packet }, null, 2));
  fs.writeFileSync(path.join(reportsDir, 'readiness-report.md'), markdownFor(result, packet));
  fs.writeFileSync(path.join(reportsDir, 'readiness-summary.svg'), svgFor(result));
  console.log(JSON.stringify(result.summary));
}

if (require.main === module) {
  main();
}
