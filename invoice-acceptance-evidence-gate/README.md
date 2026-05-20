# Invoice Acceptance Evidence Gate

This is a self-contained Revenue Infrastructure control for the customer-acceptance boundary: the moment where delivered work becomes safe to invoice.

It is intentionally not a generic billing ledger, subscription evaluator, tax tool, dispute workflow, forecast packet, committed-revenue drawdown guard, pricing experiment, or royalty settlement module. This slice asks one finance-critical question:

> Do we have enough customer evidence to invoice the delivered subscription, AI compute, data-license, or services revenue without leaking revenue or creating audit risk?

## What It Does

- Maps billing events to required acceptance evidence.
- Classifies each event as `ready_to_invoice`, `needs_review`, or `blocked`.
- Detects missing, pending, and rejected customer evidence.
- Flags aging unbilled revenue when acceptance issues linger past policy.
- Calculates a leakage-risk amount for the finance action queue.
- Emits deterministic JSON and SVG demo reports with an audit digest.

## Why This Belongs In Revenue Infrastructure

Research institutions and enterprise customers often require acceptance artifacts before invoices can be issued: signed order forms, admin acceptance records, compute usage summaries, privacy reviews, data export manifests, or milestone approval emails. Without a gate, teams either invoice too early and trigger disputes, or wait too long and leak cash through unbilled work.

## Run It

```bash
npm test
npm run demo
```

The demo writes:

- `docs/demo-output.json`
- `docs/demo.svg`
- `docs/demo.gif`

## Review Surface

The module is dependency-free and uses only synthetic data. The main API is:

```js
const { evaluateInvoiceAcceptance } = require("./index");
const report = evaluateInvoiceAcceptance(accounts, {
  asOf: "2026-05-20T00:00:00.000Z",
  minimumEvidenceScore: 100,
  agingRiskDays: 14,
});
```

The resulting report includes policy settings, per-event readiness rows, summary totals, an action queue, and a deterministic `auditDigest` for evidence packets.
