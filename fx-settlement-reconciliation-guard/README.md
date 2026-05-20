# FX Settlement Reconciliation Guard

Self-contained Revenue Infrastructure slice for issue #20. It focuses on a revenue-control gap that is different from subscription ledgers, pricing experiments, SLA credits, disputes, forecasts, committed drawdowns, plan migrations, tax-exemption checks, procurement, and partner royalty settlement: reconciling multi-currency invoices when payment providers remit cash back to the base currency.

The guard evaluates each foreign-currency settlement before revenue is posted or cash is applied.

## What It Does

- Converts foreign-currency invoice amounts into base-currency expected revenue using an approved rate book.
- Checks FX rate source strength, settlement lag, provider remittance references, duplicate remittance references, cross-border tax evidence, provider fee caps, FX variance, and booking reconciliation.
- Calculates expected base revenue, provider fees, expected net remittance, actual remittance, FX variance, and booking variance in integer cents.
- Emits deterministic SHA-256 audit digests and finance-ready recommended actions.

## Files

- `index.js` - dependency-free FX settlement evaluator.
- `test.js` - Node assertions covering ready, held, blocked, duplicate, variance, lag, fee, tax-evidence, and deterministic digest paths.
- `demo.js` - terminal demo over synthetic EUR, GBP, and KRW settlements.
- `requirements-map.md` - explicit mapping to issue #20.
- `acceptance-notes.md` - verification notes and limitations.
- `demo.svg` / `demo.mp4` - short visual demo artifacts for bounty review.

## Run

```bash
node fx-settlement-reconciliation-guard/test.js
node fx-settlement-reconciliation-guard/demo.js
```

## Example Output

```text
FX Settlement Reconciliation Guard Demo
=======================================
settlements: 3
ready: 1, held: 2, blocked: 0
expected base: $3024.70
remitted base: $2959.50
provider fees: $51.50
```

## Design Notes

The module is synthetic-data-only and has no network, Stripe, PayPal, bank, Algora, or credential integration. It is intended to be the finance-control layer that runs before real cash application, revenue recognition, or provider reconciliation.
