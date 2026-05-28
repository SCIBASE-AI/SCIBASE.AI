const fs = require('fs');
const path = require('path');

const {
  buildDeliveryPacket,
  reviewWebhookDeliveryReadiness
} = require('./index');

const ROOT = __dirname;
const REPORTS = path.join(ROOT, 'reports');
fs.mkdirSync(REPORTS, { recursive: true });

const workspace = {
  id: 'enterprise-tooling-demo-19',
  title: 'Institutional Webhook Delivery',
  maxRetryAttempts: 5,
  maxFailureAgeMinutes: 60,
  minRecentSuccesses: 2,
  subscribers: [
    {
      id: 'research-office',
      ownerId: 'org-research-office',
      active: true,
      endpoint: 'https://hooks.example.edu/scibase',
      idempotencyKey: 'evt_project_ready_2026_05',
      retryPolicy: { strategy: 'exponential', maxAttempts: 5 },
      deadLetterQueue: 'dlq-enterprise-events',
      recentSuccesses: 3,
      lastFailureMinutesAgo: 12,
      failurePayload: 'delivery failed for admin@example.edu after 1 timeout'
    },
    {
      id: 'legacy-sis',
      ownerId: '',
      active: true,
      endpoint: 'https://hooks.example.edu/legacy',
      idempotencyKey: '',
      retryPolicy: { strategy: 'fixed', maxAttempts: 9 },
      deadLetterQueue: '',
      recentSuccesses: 0,
      lastFailureMinutesAgo: 180,
      failurePayload: 'token=secret-token-123 email risky@example.edu'
    }
  ]
};

function markdownReport(packet) {
  const lines = [
    '# Enterprise Webhook Delivery Guard',
    '',
    `Workspace: ${packet.title}`,
    `Digest: ${packet.digest}`,
    '',
    '## Summary',
    '',
    `- Ready subscribers: ${packet.summary.ready}`,
    `- Held subscribers: ${packet.summary.hold}`,
    '',
    '## Subscribers'
  ];

  for (const subscriber of packet.subscribers) {
    lines.push('', `### ${subscriber.subscriberId}`, '');
    lines.push(`- Decision: ${subscriber.decision}`);
    lines.push(`- Retry strategy: ${subscriber.metrics.retryStrategy}`);
    lines.push(`- Recent successes: ${subscriber.metrics.recentSuccesses}`);
    lines.push(`- Last failure age: ${subscriber.metrics.lastFailureMinutesAgo} minutes`);
    lines.push(`- Holds: ${subscriber.holds.join(', ') || 'none'}`);
    lines.push(`- Redacted failure payload: ${subscriber.redactedFailurePayload}`);
  }

  return `${lines.join('\n')}\n`;
}

function svgSummary(packet) {
  const rows = packet.subscribers
    .map((subscriber, index) => {
      const y = 168 + index * 76;
      const color = subscriber.decision === 'ready' ? '#22c55e' : '#f97316';
      return [
        `<rect x="70" y="${y}" width="1020" height="54" rx="12" fill="#111827" stroke="${color}" stroke-width="3"/>`,
        `<text x="96" y="${y + 34}" fill="#e5e7eb" font-size="21">${subscriber.subscriberId}: ${subscriber.decision}</text>`,
        `<text x="590" y="${y + 34}" fill="#cbd5e1" font-size="18">holds ${subscriber.holds.length} | successes ${subscriber.metrics.recentSuccesses}</text>`
      ].join('\n');
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="420" viewBox="0 0 1160 420">
  <rect width="1160" height="420" fill="#0f172a"/>
  <text x="70" y="75" fill="#f8fafc" font-size="36" font-family="Arial">Webhook Delivery Guard</text>
  <text x="70" y="120" fill="#bae6fd" font-size="22" font-family="Arial">Ready ${packet.summary.ready} | Hold ${packet.summary.hold}</text>
  ${rows}
</svg>
`;
}

const review = reviewWebhookDeliveryReadiness(workspace);
const packet = buildDeliveryPacket(workspace, review);

fs.writeFileSync(path.join(REPORTS, 'readiness-report.json'), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(REPORTS, 'readiness-report.md'), markdownReport(packet));
fs.writeFileSync(path.join(REPORTS, 'readiness-summary.svg'), svgSummary(packet));

console.log(JSON.stringify(packet.summary));
