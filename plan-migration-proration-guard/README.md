# Plan Migration Proration Guard

Self-contained Revenue Infrastructure slice for issue #20. It focuses on a revenue leakage point that is separate from the existing subscription ledger, pricing experiment, SLA credit, dispute, forecast, committed-drawdown, tax, procurement, and partner royalty modules: plan changes inside an active contract.

When an institutional customer upgrades, downgrades, converts from trial, or changes plan mix mid-term, the guard calculates the unused current-plan credit, target prorated charge, net invoice, credit memo, AI compute credit carryover, seat floor compliance, and approval requirements before finance posts the migration.

## What It Does

- Calculates unused current-plan credit and target prorated charge from the remaining contract term.
- Produces net invoice and credit memo amounts in integer cents.
- Blocks missing accounts, inactive contracts, currency mismatches, unapproved plans, seat-floor violations, duplicate invoices, unsigned quotes, missing invoices, and missing trial-to-paid payment evidence.
- Holds large invoices, large credit memos, mid-term downgrades, and excessive AI compute credit carryover for approval.
- Emits deterministic SHA-256 audit digests and reviewer-ready recommended actions.

## Files

- `index.js` - dependency-free migration evaluator.
- `test.js` - Node assertions covering ready, held, blocked, duplicate, trial conversion, validation, and deterministic digest paths.
- `demo.js` - terminal demo over synthetic institutional migration data.
- `requirements-map.md` - explicit mapping to issue #20.
- `acceptance-notes.md` - verification notes and limitations.
- `demo.svg` / `demo.mp4` - short visual demo artifacts for bounty review.

## Run

```bash
node plan-migration-proration-guard/test.js
node plan-migration-proration-guard/demo.js
```

## Example Output

```text
Plan Migration Proration Guard Demo
===================================
migrations: 3
ready: 1, held: 1, blocked: 1
net invoice: $3856.44
credit memo: $1063.23
```

## Design Notes

The module is synthetic-data-only and has no network, Stripe, PayPal, bank, Algora, or credential integration. It is intended to be the finance-control layer that runs before a real invoice, credit memo, entitlement update, or payment provider call is finalized.
