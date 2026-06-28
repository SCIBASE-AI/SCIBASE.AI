import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateDisputeBatch } from '../src/disputeGuard.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const packets = JSON.parse(await readFile(join(root, 'data', 'dispute-packets.json'), 'utf8'));
const report = evaluateDisputeBatch(packets, { now: '2026-06-27T08:00:00Z' });
const artifactDir = join(root, 'artifacts');

await mkdir(artifactDir, { recursive: true });
await writeFile(
  join(artifactDir, 'dispute-review-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(join(artifactDir, 'dispute-review-report.md'), renderMarkdown(report));
await writeFile(join(artifactDir, 'dispute-review-demo.svg'), renderSvg(report));

console.log(`Generated ${report.summary.totalPackets} dispute packet decisions.`);
console.log(`Overall decision: ${report.summary.overallDecision}`);
console.log(`Artifacts: ${artifactDir}`);

function renderMarkdown(report) {
  const rows = report.results.map((result) => {
    return [
      result.id,
      result.invoiceId,
      result.processorCaseId,
      cents(result.netAmountAtRiskCents),
      result.decision,
      result.findings.map((finding) => finding.code).join(', ') || 'none',
    ];
  });

  return `# Payment Dispute Evidence Guard Demo

Generated at: ${report.generatedAt}

## Summary

- Total packets: ${report.summary.totalPackets}
- Net amount at risk: ${cents(report.summary.totalNetAmountAtRiskCents)}
- Overall decision: ${report.summary.overallDecision}
- Release: ${report.summary.decisions.RELEASE_RESPONSE}
- Review before response: ${report.summary.decisions.REVIEW_BEFORE_RESPONSE}
- Hold response: ${report.summary.decisions.HOLD_RESPONSE}
- Findings: ${report.summary.findings}

## Packet Decisions

| Packet | Invoice | Processor case | Net risk | Decision | Findings |
| --- | --- | --- | ---: | --- | --- |
${rows.map((row) => `| ${row.join(' | ')} |`).join('\n')}

## Controls Covered

- Processor response deadline and urgency checks.
- Required evidence completeness for contract, invoice, delivery, usage, terms, communication, and redacted receipt.
- Prior refund and credit memo offsets to prevent duplicate recovery.
- Duplicate processor case detection across exported packets.
- Customer notice timing before response release.
- Sensitive receipt data redaction before finance exports.
`;
}

function renderSvg(report) {
  const width = 960;
  const height = 520;
  const cardHeight = 72;
  const startY = 150;
  const colors = {
    RELEASE_RESPONSE: '#1f8a5b',
    REVIEW_BEFORE_RESPONSE: '#b7791f',
    HOLD_RESPONSE: '#b42318',
  };
  const cards = report.results.map((result, index) => {
    const y = startY + index * (cardHeight + 16);
    const color = colors[result.decision];
    return `<g>
  <rect x="56" y="${y}" width="848" height="${cardHeight}" rx="8" fill="#ffffff" stroke="#d0d7de"/>
  <rect x="56" y="${y}" width="12" height="${cardHeight}" rx="6" fill="${color}"/>
  <text x="88" y="${y + 28}" font-size="17" font-weight="700" fill="#24292f">${escapeXml(result.id)} - ${escapeXml(result.invoiceId)}</text>
  <text x="88" y="${y + 52}" font-size="13" fill="#57606a">${escapeXml(result.processorCaseId)} | net risk ${escapeXml(cents(result.netAmountAtRiskCents))} | findings ${result.findingCount}</text>
  <text x="650" y="${y + 41}" font-size="15" font-weight="700" fill="${color}">${escapeXml(result.decision)}</text>
</g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">Payment dispute evidence guard demo</title>
<desc id="desc">Reviewer artifact showing release, review, and hold decisions for synthetic payment dispute packets.</desc>
<rect width="${width}" height="${height}" fill="#f6f8fa"/>
<text x="56" y="58" font-size="30" font-weight="800" fill="#24292f">Payment Dispute Evidence Guard</text>
<text x="56" y="88" font-size="15" fill="#57606a">Overall decision: ${escapeXml(report.summary.overallDecision)} | Net amount at risk: ${escapeXml(cents(report.summary.totalNetAmountAtRiskCents))}</text>
<g>
  <rect x="56" y="108" width="190" height="28" rx="6" fill="#dafbe1"/>
  <text x="70" y="127" font-size="13" fill="#1a7f37">Release ${report.summary.decisions.RELEASE_RESPONSE}</text>
  <rect x="260" y="108" width="190" height="28" rx="6" fill="#fff8c5"/>
  <text x="274" y="127" font-size="13" fill="#9a6700">Review ${report.summary.decisions.REVIEW_BEFORE_RESPONSE}</text>
  <rect x="464" y="108" width="190" height="28" rx="6" fill="#ffebe9"/>
  <text x="478" y="127" font-size="13" fill="#cf222e">Hold ${report.summary.decisions.HOLD_RESPONSE}</text>
</g>
${cards}
</svg>
`;
}

function cents(value) {
  return `$${(value / 100).toFixed(2)}`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
