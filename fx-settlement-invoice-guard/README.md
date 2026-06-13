# FX Settlement Invoice Guard

Self-contained guard for SCIBASE issue #20, focused on revenue infrastructure.

The module validates synthetic multi-currency invoice packets before invoice release or revenue close. It catches stale FX snapshots, unsupported currency minor units, settlement mismatches, rounding drift, missing processor references, credit-note offsets, and missing finance approval for material FX variance.

## Scope

- invoice currency, account currency, and settlement currency consistency
- FX snapshot age and source metadata
- currency minor-unit rounding
- expected settlement amount vs processor settlement amount
- credit note and refund offset handling
- material FX variance approval requirements
- deterministic release/hold/block decisions

## Decisions

- `RELEASE_INVOICE`
- `REVIEW_BEFORE_RELEASE`
- `HOLD_INVOICE`

## Local Validation

```bash
npm test
npm run demo
node --check src/index.js
node --check scripts/demo.js
node --check test/fxSettlementInvoiceGuard.test.js
git diff --check
```

## Boundaries

- synthetic invoice packets only
- no payment processor calls
- no live FX market data
- no bank details
- no credentials
- no private customer data
