# Payment Dispute Evidence Guard

This module adds a dependency-free revenue-control slice for issue #20. It evaluates whether synthetic processor dispute packets are ready to leave finance before revenue is recognized, released, or defended through a payment processor response.

The guard is intentionally offline: it uses no credentials, no payment processor API, no bank data, no real customer records, and no external network calls.

## What It Checks

- Processor response deadline and urgent response windows.
- Required evidence completeness: contract, invoice, delivery proof, usage logs, terms acceptance, customer communication, and redacted receipt.
- Prior refunds and credit memos that already offset a disputed amount.
- Duplicate processor case IDs across exported response packets.
- Customer notification timing after dispute receipt.
- Sensitive receipt leakage such as full payment card numbers.
- Finance-ready decisions: `RELEASE_RESPONSE`, `REVIEW_BEFORE_RESPONSE`, and `HOLD_RESPONSE`.

## Requirement Map

| Issue #20 revenue requirement | Coverage in this module |
| --- | --- |
| Secure payment integrations | Validates dispute packets before processor response export without calling live processors. |
| Billing engine controls | Compares dispute amounts, recognized revenue, refunds, and credit memos before release. |
| Institutional invoicing | Links account, invoice, and customer notice evidence for finance review. |
| Audit-ready operations | Emits JSON and Markdown reviewer packets with findings and remediation steps. |
| Predictable recurring revenue | Holds risky dispute packets before duplicate recovery, missed windows, or unredacted evidence distort revenue. |

## Files

- `src/disputeGuard.mjs` - deterministic decision engine.
- `data/dispute-packets.json` - synthetic reviewer packets.
- `test/disputeGuard.test.mjs` - Node test coverage.
- `scripts/run-demo.mjs` - generates reviewer artifacts.
- `artifacts/` - generated JSON, Markdown, and SVG outputs after running the demo.

## Validation

```bash
npm test
npm run demo
```

The demo writes:

- `artifacts/dispute-review-report.json`
- `artifacts/dispute-review-report.md`
- `artifacts/dispute-review-demo.svg`

## Review Notes

This is a distinct slice from subscription pricing, usage metering, grant milestones, FX settlement, tax/VAT, event sponsorship, and cost-center allocation work. It focuses only on payment-processor dispute evidence readiness and revenue-release risk.
