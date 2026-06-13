const fs = require('fs');
const path = require('path');
const { evaluateReceiptPrivacy, buildSampleBatch } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluateReceiptPrivacy(buildSampleBatch());
const emptyResult = evaluateReceiptPrivacy({
  batchId: 'billing-empty-review-20',
  generatedAt: '2026-05-30T12:00:00Z'
});
const malformedResult = evaluateReceiptPrivacy({
  batchId: 'billing-malformed-fields-review-20',
  generatedAt: '2026-05-30T12:15:00Z',
  receipts: [
    {
      id: 'receipt-malformed-numeric-fields',
      invoiceId: 'inv-malformed-numeric-fields',
      customerId: 'customer-lab-013',
      currency: 'USD',
      totalCents: 'free-form total',
      providerMetadata: {
        accountRef: 'acct-lab-013',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-malformed-numeric-fields',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-malformed-quantity',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 'one',
          unit: 'month',
          amountCents: -2500
        }
      ]
    }
  ]
});
const malformedLineItemResult = evaluateReceiptPrivacy({
  batchId: 'billing-malformed-line-item-review-20',
  generatedAt: '2026-05-31T08:45:00Z',
  receipts: [
    {
      id: 'receipt-malformed-line-item',
      invoiceId: 'inv-malformed-line-item',
      customerId: 'customer-lab-014',
      currency: 'USD',
      totalCents: 19900,
      providerMetadata: {
        accountRef: 'acct-lab-014',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-malformed-line-item',
        plan: 'lab-pro'
      },
      lineItems: [null]
    }
  ]
});
const malformedBatchResult = evaluateReceiptPrivacy(null);

const packetPath = path.join(reportsDir, 'receipt-privacy-packet.json');
const emptyPacketPath = path.join(reportsDir, 'empty-receipt-privacy-packet.json');
const malformedPacketPath = path.join(reportsDir, 'malformed-receipt-privacy-packet.json');
const malformedLineItemPacketPath = path.join(reportsDir, 'malformed-line-item-privacy-packet.json');
const malformedBatchPacketPath = path.join(reportsDir, 'malformed-batch-privacy-packet.json');
const reportPath = path.join(reportsDir, 'receipt-privacy-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(emptyPacketPath, `${JSON.stringify(emptyResult, null, 2)}\n`);
fs.writeFileSync(malformedPacketPath, `${JSON.stringify(malformedResult, null, 2)}\n`);
fs.writeFileSync(malformedLineItemPacketPath, `${JSON.stringify(malformedLineItemResult, null, 2)}\n`);
fs.writeFileSync(malformedBatchPacketPath, `${JSON.stringify(malformedBatchResult, null, 2)}\n`);

const receipts = result.receipts
  .map(
    (receipt) =>
      `- ${receipt.id}: ${receipt.decision}, findings: ${
        receipt.findings.length > 0 ? receipt.findings.join(', ') : 'none'
      }`
  )
  .join('\n');

const actions = result.remediationActions
  .map((action) => `- ${action.id}: ${action.action} (${action.priority})`)
  .join('\n');

const markdown = `# Billing Receipt Privacy Guard

Batch: ${result.batchId}
Generated: ${result.generatedAt}

## Summary

- Deliverable receipts: ${result.summary.deliverableReceipts}
- Held receipts: ${result.summary.heldReceipts}
- Remediation actions: ${result.summary.remediationActions}
- Total cents reviewed: ${result.summary.totalCentsReviewed}
- Audit digest: ${result.auditDigest}

## Receipt Decisions

${receipts}

## Remediation Actions

${actions}

## Sparse Billing Batch Guard

Empty or partially populated provider batches that omit receipt or line-item collections produce deterministic empty review evidence instead of runtime failures. The empty batch fixture reviewed ${emptyResult.receipts.length} receipts and generated ${emptyResult.remediationActions.length} remediation actions.

## Malformed Billing Field Guard

Receipts with non-numeric totals, quantities, or line-item amounts are held before delivery. The malformed fixture decision is ${malformedResult.receipts[0].decision}, and customer-facing numeric fields are redacted to ${malformedResult.receipts[0].customerCopy.totalCents}.

## Malformed Line Item Guard

Malformed line-item entries are held before delivery instead of crashing receipt review. The malformed line-item fixture decision is ${malformedLineItemResult.receipts[0].decision}, and the customer-facing line item id is ${malformedLineItemResult.receipts[0].customerCopy.lineItems[0].id}.

## Malformed Billing Batch Guard

Malformed top-level billing batches are held before delivery instead of crashing receipt review. The malformed batch fixture decision is ${malformedBatchResult.receipts[0].decision}, and the finance-review finding is ${malformedBatchResult.receipts[0].findings[0]}.

## Safety

All fixtures are synthetic. The guard does not call payment processors, customer systems, private workspaces, institutional finance tools, or external APIs.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#102027"/>
  <rect x="54" y="58" width="1172" height="604" rx="16" fill="#17313a" stroke="#9bd67a" stroke-width="4"/>
  <text x="96" y="134" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Billing Receipt Privacy Guard</text>
  <text x="96" y="208" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Deliverable receipts: ${result.summary.deliverableReceipts}</text>
  <text x="96" y="258" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Held receipts: ${result.summary.heldReceipts}</text>
  <text x="96" y="308" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Remediation actions: ${result.summary.remediationActions}</text>
  <text x="96" y="380" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Checks: line-item text, provider metadata, restricted datasets, collaborator identifiers</text>
  <text x="96" y="448" fill="#ffd37a" font-family="Arial, sans-serif" font-size="26">Private research context is replaced before receipts leave SCIBASE.</text>
  <text x="96" y="574" fill="#a6d7c3" font-family="Arial, sans-serif" font-size="18">${result.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, emptyPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedLineItemPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedBatchPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Deliverable receipts: ${result.summary.deliverableReceipts}`);
console.log(`Held receipts: ${result.summary.heldReceipts}`);
