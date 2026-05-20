# Usage Anomaly Credit Memo Guard

This focused slice adds routes suspicious usage overage credit requests to finance review for issue #20.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node usage-anomaly-credit-memo-guard/test.js
node usage-anomaly-credit-memo-guard/demo.js
```

Generated outputs are written to `usage-anomaly-credit-memo-guard/reports/`.

## Why this is distinct

This does not duplicate billing engines, metering, tax, revenue dispute, SLA credits, royalties, forecast variance, FX settlement, plan migration, procurement, invoice acceptance, sanctions/export-control, payment rail failover, or entitlement downgrade slices. It focuses specifically on routes suspicious usage overage credit requests to finance review.
