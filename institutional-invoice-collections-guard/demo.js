'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { evaluatePortfolio, formatMoney } = require('./index');

const reportDir = path.join(__dirname, 'reports');
const asOfDate = '2026-05-22';

const invoices = [
  {
    id: 'INV-SCI-2041',
    customer: 'North Valley Research Office',
    currency: 'USD',
    issueDate: '2026-02-10',
    dueDate: '2026-03-10',
    amountCents: 500000,
    deliveryAccepted: true,
    activeResearch: true,
    payments: [],
    disputes: [],
    promisedPays: [],
    financeContacts: [
      { name: 'A. Finance', email: 'finance@northvalley.example', verified: true },
      { name: 'B. Grants', email: 'grants@northvalley.example', verified: true }
    ],
    dunningHistory: [
      { date: '2026-04-15', channel: 'email', outcome: 'no_response' },
      { date: '2026-05-06', channel: 'email', outcome: 'asked_for_eta' }
    ]
  },
  {
    id: 'INV-SCI-2077',
    customer: 'Lakeside Methods Lab',
    currency: 'USD',
    issueDate: '2026-04-12',
    dueDate: '2026-05-01',
    amountCents: 320000,
    deliveryAccepted: true,
    activeResearch: false,
    payments: [
      { date: '2026-05-14', amountCents: 120000, status: 'posted' }
    ],
    disputes: [],
    promisedPays: [
      { date: '2026-05-28', amountCents: 200000, evidenceId: 'promise-email-2077' }
    ],
    financeContacts: [
      { name: 'Lab Finance', email: 'finance@lakeside.example', verified: true },
      { name: 'PI', email: 'pi@lakeside.example', verified: true }
    ],
    dunningHistory: [
      { date: '2026-05-10', channel: 'email', outcome: 'promise_received' }
    ]
  },
  {
    id: 'INV-SCI-2099',
    customer: 'Regional Consortium BioHub',
    currency: 'USD',
    issueDate: '2026-03-01',
    dueDate: '2026-04-01',
    amountCents: 910000,
    deliveryAccepted: true,
    activeResearch: true,
    payments: [
      { date: '2026-04-15', amountCents: 300000, status: 'posted' },
      { date: '2026-05-04', amountCents: 100000, status: 'failed' }
    ],
    disputes: [],
    promisedPays: [],
    financeContacts: [
      { name: 'Consortium AP', email: 'ap@biohub.example', verified: true }
    ],
    dunningHistory: [
      { date: '2026-05-17', channel: 'email', outcome: 'no_response' },
      { date: '2026-05-20', channel: 'portal', outcome: 'opened' }
    ]
  },
  {
    id: 'INV-SCI-2112',
    customer: 'Coastal Data Institute',
    currency: 'USD',
    issueDate: '2026-04-20',
    dueDate: '2026-05-20',
    amountCents: 180000,
    deliveryAccepted: false,
    activeResearch: false,
    payments: [],
    disputes: [],
    promisedPays: [],
    financeContacts: [
      { name: 'Finance Queue', email: 'finance@coastal.example', verified: true }
    ],
    dunningHistory: []
  },
  {
    id: 'INV-SCI-2120',
    customer: 'Central Clinical Research Unit',
    currency: 'USD',
    issueDate: '2026-04-15',
    dueDate: '2026-05-15',
    amountCents: 250000,
    deliveryAccepted: true,
    activeResearch: true,
    payments: [],
    disputes: [
      { type: 'purchase_order_mismatch', status: 'open' }
    ],
    promisedPays: [],
    financeContacts: [
      { name: 'Controller', email: 'controller@ccru.example', verified: true },
      { name: 'Research Ops', email: 'researchops@ccru.example', verified: true }
    ],
    dunningHistory: [
      { date: '2026-05-18', channel: 'email', outcome: 'po_mismatch_claimed' }
    ]
  }
];

fs.mkdirSync(reportDir, { recursive: true });

const portfolio = evaluatePortfolio(invoices, { asOfDate });
const jsonPath = path.join(reportDir, 'invoice-collections-packet.json');
const markdownPath = path.join(reportDir, 'invoice-collections-report.md');
const svgPath = path.join(reportDir, 'summary.svg');
const mp4Path = path.join(reportDir, 'demo.mp4');

fs.writeFileSync(jsonPath, `${JSON.stringify(portfolio, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdown(portfolio));
fs.writeFileSync(svgPath, renderSvg(portfolio));
renderVideo(portfolio, mp4Path);

console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), mp4Path)}`);

function renderMarkdown(portfolio) {
  const rows = portfolio.packets.map((packet) => [
    packet.invoiceId,
    packet.customer,
    packet.agingBucket,
    packet.outstandingDisplay,
    packet.severity,
    packet.action,
    packet.entitlementTreatment
  ]);

  return [
    '# Institutional Invoice Collections Guard Report',
    '',
    `As of: ${portfolio.asOfDate}`,
    `Portfolio digest: \`${portfolio.auditDigest}\``,
    '',
    '## Summary',
    '',
    `- Invoices reviewed: ${portfolio.invoiceCount}`,
    `- Outstanding balance: ${portfolio.outstandingDisplay}`,
    `- High-risk invoices: ${portfolio.highRiskInvoices.join(', ') || 'none'}`,
    `- Actions: ${Object.entries(portfolio.byAction).map(([action, count]) => `${action}=${count}`).join(', ')}`,
    '',
    '## Invoice Decisions',
    '',
    '| Invoice | Customer | Aging | Outstanding | Severity | Action | Entitlement treatment |',
    '| --- | --- | --- | ---: | --- | --- | --- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
    '## Guardrails',
    '',
    '- Uses synthetic invoice, payment, dispute, promise-to-pay, and dunning records only.',
    '- Does not call Stripe, PayPal, ACH, ERP, bank, wallet, or customer systems.',
    '- Preserves active research continuity by recommending non-disruptive soft holds before access changes.',
    '- Produces deterministic audit digests for finance review packets.',
    ''
  ].join('\n');
}

function renderSvg(portfolio) {
  const highRisk = portfolio.highRiskInvoices.length;
  const buckets = Object.entries(portfolio.byBucket)
    .map(([bucket, cents]) => `${escapeXml(bucket)}: ${escapeXml(formatMoney(cents, 'USD'))}`)
    .join(' / ');
  const actions = Object.entries(portfolio.byAction)
    .map(([action, count]) => `${escapeXml(action)} (${count})`)
    .join(' / ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Institutional invoice collections guard summary</title>
  <desc id="desc">Synthetic accounts receivable aging and collections decisions.</desc>
  <rect width="1280" height="720" fill="#0f172a"/>
  <rect x="70" y="70" width="1140" height="580" rx="18" fill="#f8fafc"/>
  <text x="110" y="140" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#111827">Invoice collections guard</text>
  <text x="110" y="195" font-family="Arial, sans-serif" font-size="26" fill="#334155">Synthetic AR aging, dunning cadence, entitlement holds, and write-off routing</text>
  <rect x="110" y="245" width="310" height="150" rx="14" fill="#dbeafe"/>
  <text x="135" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1e3a8a">${portfolio.invoiceCount} invoices</text>
  <text x="135" y="350" font-family="Arial, sans-serif" font-size="26" fill="#1e40af">${escapeXml(portfolio.outstandingDisplay)} open</text>
  <rect x="465" y="245" width="310" height="150" rx="14" fill="#fee2e2"/>
  <text x="490" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#7f1d1d">${highRisk} high-risk</text>
  <text x="490" y="350" font-family="Arial, sans-serif" font-size="26" fill="#991b1b">soft holds only</text>
  <rect x="820" y="245" width="310" height="150" rx="14" fill="#dcfce7"/>
  <text x="845" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#14532d">No live billing</text>
  <text x="845" y="350" font-family="Arial, sans-serif" font-size="26" fill="#166534">synthetic data only</text>
  <text x="110" y="465" font-family="Arial, sans-serif" font-size="25" fill="#111827">Aging: ${buckets}</text>
  <text x="110" y="520" font-family="Arial, sans-serif" font-size="24" fill="#111827">Actions: ${actions}</text>
  <text x="110" y="590" font-family="Arial, sans-serif" font-size="20" fill="#475569">Digest: ${portfolio.auditDigest.slice(0, 32)}...</text>
</svg>
`;
}

function renderVideo(portfolio, outputPath) {
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const highRisk = portfolio.highRiskInvoices.length;
  const filters = [
    drawText(font, 'SCIBASE #20 Revenue Infrastructure', 64, 70, 44, 'white'),
    drawText(font, 'Institutional invoice collections and AR aging guard', 64, 135, 34, 'white'),
    drawText(font, `Reviewed ${portfolio.invoiceCount} synthetic invoices`, 84, 235, 36, '0xdbeafe'),
    drawText(font, `Outstanding ${portfolio.outstandingDisplay}`, 84, 300, 36, '0xfef3c7'),
    drawText(font, `High-risk invoices ${highRisk}`, 84, 365, 36, '0xfecaca'),
    drawText(font, 'Actions: collections packets, promised-pay holds, dispute routing, acceptance holds', 84, 455, 28, '0xdcfce7'),
    drawText(font, 'No live customer, payment processor, bank, wallet, or accounting calls', 84, 515, 28, '0xe0f2fe'),
    drawText(font, `Audit digest ${portfolio.auditDigest.slice(0, 24)}`, 84, 590, 24, '0xcbd5e1')
  ].join(',');

  const result = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x0f172a:s=1280x720:d=4:r=25',
    '-vf', filters,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    outputPath
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`ffmpeg failed to render demo.mp4:\n${message}`);
  }
}

function drawText(font, text, x, y, size, color) {
  return `drawtext=fontfile='${font}':text='${escapeDrawText(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}

function escapeDrawText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
