const fs = require('fs');
const path = require('path');

const {
  buildDiscoveryPacket,
  reviewKnowledgeGraphSignals
} = require('./index');

const ROOT = __dirname;
const REPORTS = path.join(ROOT, 'reports');
fs.mkdirSync(REPORTS, { recursive: true });

const graph = {
  id: 'kg-demo-17',
  title: 'Neuroimmune Discovery Graph',
  reviewDate: '2026-05-28',
  edges: [
    {
      id: 'edge-recommend-ready',
      source: 'CRISPR protocol A',
      relation: 'supports',
      target: 'neuronal clustering assay',
      recommendationCandidate: true,
      surfacesNegativeEvidence: true,
      evidence: [
        { polarity: 'positive', doi: '10.0000/kg.ready.1', context: 'replicated assay' },
        { polarity: 'positive', doi: '10.0000/kg.ready.2', context: 'external lab' }
      ],
      auditLog: 'curator scientist@example.edu accepted edge'
    },
    {
      id: 'edge-null-hidden',
      source: 'Model X',
      relation: 'predicts',
      target: 'therapy response Y',
      recommendationCandidate: true,
      surfacesNegativeEvidence: false,
      evidence: [
        { polarity: 'positive', doi: '10.0000/kg.model.1', context: 'training cohort' },
        { polarity: 'null', doi: '', context: '' },
        { polarity: 'failed-replication', doi: '10.0000/kg.fail.1', context: 'external cohort' }
      ],
      auditLog: 'token=kg-secret scientist@example.edu hid null result'
    }
  ],
  intersections: [
    {
      id: 'gap-neuroimmune-materials',
      concepts: ['neuroimmune marker', 'biomaterial scaffold'],
      citationCount: 2,
      unresolvedQuestions: ['Does scaffold porosity change marker expression?'],
      surfacedAsGap: false
    }
  ]
};

function markdownReport(packet) {
  const lines = [
    '# Knowledge Graph Null Result Gap Guard',
    '',
    `Graph: ${packet.title}`,
    `Review date: ${packet.reviewDate}`,
    `Digest: ${packet.digest}`,
    '',
    '## Summary',
    '',
    `- Ready recommendation edges: ${packet.summary.ready}`,
    `- Held recommendation edges: ${packet.summary.hold}`,
    `- Knowledge gaps to surface: ${packet.summary.gaps}`,
    '',
    '## Edges'
  ];

  for (const edge of packet.edges) {
    lines.push('', `### ${edge.edgeId}`, '');
    lines.push(`- Relation: ${edge.source} ${edge.relation} ${edge.target}`);
    lines.push(`- Decision: ${edge.decision}`);
    lines.push(`- Holds: ${edge.holds.join(', ') || 'none'}`);
    lines.push(`- Evidence: ${edge.metrics.evidenceCount}`);
    lines.push(`- Redacted audit log: ${edge.redactedAuditLog}`);
  }

  lines.push('', '## Knowledge Gaps');
  for (const gap of packet.knowledgeGaps) {
    lines.push('', `### ${gap.intersectionId}`, '');
    lines.push(`- Concepts: ${gap.concepts.join(' + ')}`);
    lines.push(`- Decision: ${gap.decision}`);
    lines.push(`- Actions: ${gap.actions.join(', ') || 'none'}`);
  }

  return `${lines.join('\n')}\n`;
}

function svgSummary(packet) {
  const rows = packet.edges
    .map((edge, index) => {
      const y = 170 + index * 76;
      const color = edge.decision === 'ready' ? '#22c55e' : '#f97316';
      return [
        `<rect x="70" y="${y}" width="1020" height="54" rx="12" fill="#111827" stroke="${color}" stroke-width="3"/>`,
        `<text x="96" y="${y + 34}" fill="#e5e7eb" font-size="21">${edge.edgeId}: ${edge.decision}</text>`,
        `<text x="590" y="${y + 34}" fill="#cbd5e1" font-size="18">evidence ${edge.metrics.evidenceCount} | holds ${edge.holds.length}</text>`
      ].join('\n');
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="430" viewBox="0 0 1160 430">
  <rect width="1160" height="430" fill="#0f172a"/>
  <text x="70" y="75" fill="#f8fafc" font-size="36" font-family="Arial">KG Null Result Gap Guard</text>
  <text x="70" y="120" fill="#bae6fd" font-size="22" font-family="Arial">Ready ${packet.summary.ready} | Hold ${packet.summary.hold} | Gaps ${packet.summary.gaps}</text>
  ${rows}
</svg>
`;
}

const review = reviewKnowledgeGraphSignals(graph);
const packet = buildDiscoveryPacket(graph, review);

fs.writeFileSync(path.join(REPORTS, 'kg-null-gap-review.json'), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(REPORTS, 'kg-null-gap-review.md'), markdownReport(packet));
fs.writeFileSync(path.join(REPORTS, 'kg-null-gap-summary.svg'), svgSummary(packet));

console.log(JSON.stringify(packet.summary));
