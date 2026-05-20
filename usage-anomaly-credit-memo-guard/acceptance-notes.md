# Acceptance Notes

## Scope

Adds routes suspicious usage overage credit requests to finance review for issue #20.

## Non-overlap

This slice avoids billing engines, metering, tax, revenue dispute, SLA credits, royalties, forecast variance, FX settlement, plan migration, procurement, invoice acceptance, sanctions/export-control, payment rail failover, or entitlement downgrade slices.

## Validation

```bash
node usage-anomaly-credit-memo-guard/test.js
node usage-anomaly-credit-memo-guard/demo.js
file usage-anomaly-credit-memo-guard/reports/demo.webm usage-anomaly-credit-memo-guard/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `usage-anomaly-credit-memo-guard tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
