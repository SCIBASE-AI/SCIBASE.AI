# Subscription Entitlement Downgrade Guard

This focused slice adds a subscription entitlement downgrade guard for Revenue Infrastructure in issue #20.

It validates downgrade requests before revenue and entitlement state are changed, then produces finance-facing remediation actions for blocked requests.

## What it checks

- Active seat count versus requested plan limit.
- Storage usage versus requested plan quota.
- Committed compute hours versus requested compute quota.
- Enterprise-only features that require a migration plan.
- Past-due invoices requiring finance review.
- Annual commitment windows and grace-period rules.

## Run it

```bash
node subscription-entitlement-downgrade-guard/test.js
node subscription-entitlement-downgrade-guard/demo.js
```

Generated JSON, Markdown, SVG, and `demo.webm` outputs live in `subscription-entitlement-downgrade-guard/reports/`.

## Why this is distinct

This is not a billing engine, usage metering module, tax workflow, dispute guard, SLA credit guard, royalty settlement guard, forecast variance guard, FX reconciliation, plan-migration proration guard, procurement workflow, invoice acceptance gate, sanctions/export-control gate, or payment rail failover guard. It focuses specifically on entitlement readiness before a downgrade is activated.
