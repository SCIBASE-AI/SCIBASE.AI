# Billing Receipt Privacy Guard

This module adds a focused Revenue Infrastructure slice for SCIBASE issue #20. It validates customer-facing invoices, receipts, and payment-provider metadata before billing artifacts leave SCIBASE.

The guard detects private research project context, restricted dataset references, collaborator identifiers, grant-sensitive phrases, payment-routing-sensitive metadata, unsafe receipt identifiers, unsafe customer-facing envelope fields, malformed monetary or quantity fields, malformed top-level billing batches, malformed line-item entries, unsafe line-item fields, and unsafe provider metadata, including nested provider metadata values and provider metadata key names. Missing receipt lists, line-item lists, and provider metadata are treated as empty billing evidence rather than crashing receipt review. Safe receipts remain deliverable, while unsafe receipts are held for finance review with redacted replacement identifiers, safe currency labels, replacement line items, metadata-key redaction handles, and deterministic audit evidence.

This is a receipt/privacy gate. It redacts settlement-reference, processor-settlement, bank-account, IBAN, SWIFT, ACH, SEPA, and similar payment-routing metadata before customer delivery, but it does not validate FX rates, minor-unit rounding, processor settlement deltas, credit offsets, or accounting variance approvals.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/receipt-privacy-packet.json`
- `reports/malformed-receipt-privacy-packet.json`
- `reports/malformed-line-item-privacy-packet.json`
- `reports/malformed-batch-privacy-packet.json`
- `reports/receipt-privacy-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call payment processors, customer systems, private workspaces, institutional finance tools, or external APIs.
