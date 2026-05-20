# Contract Allocation Guard

Self-contained Revenue Infrastructure slice for issue #20. It focuses on a revenue-control gap that is different from subscription billing, metering, disputes, SLA credits, partner royalties, plan migrations, FX settlement, forecasting, procurement, licensing privacy gates, and invoice acceptance: allocating bundled enterprise contract value across multiple performance obligations.

The guard evaluates whether subscription seats, AI compute credits, analytics licenses, and material rights have defensible standalone-selling-price evidence before revenue is earned or deferred.

## What It Does

- Allocates total contract consideration across obligations by relative standalone selling price.
- Checks bundle discount caps, line-level discount caps, SSP evidence strength, ratable service dates, usage estimates, delivery evidence, and material-right expiration.
- Builds ratable monthly schedules, usage-based earned revenue, point-in-time recognition readiness, and deferred revenue balances.
- Emits deterministic SHA-256 audit digests and finance-ready recommended actions.

## Files

- `index.js` - dependency-free contract allocation evaluator.
- `test.js` - Node assertion coverage for ready, held, blocked, rounding, discount, evidence, date, and digest paths.
- `demo.js` - terminal demo over synthetic enterprise contracts.
- `requirements-map.md` - explicit mapping to issue #20.
- `acceptance-notes.md` - verification notes and limitations.
- `demo.svg` / `demo.mp4` - short visual demo artifacts for bounty review.

## Run

```bash
node contract-allocation-guard/test.js
node contract-allocation-guard/demo.js
```

## Example Output

```text
Contract Allocation Guard Demo
================================
contracts: 3
ready: 1, held: 1, blocked: 1
allocated revenue: $280000.00
earned through 2026-05-20: $126763.93
deferred revenue: $153236.07
```

## Design Notes

The module is synthetic-data-only and has no network, Stripe, PayPal, bank, Algora, or credential integration. It is intended to be the revenue-operations layer that runs before real contract allocation memos, earned revenue booking, or deferred revenue schedules are approved.
