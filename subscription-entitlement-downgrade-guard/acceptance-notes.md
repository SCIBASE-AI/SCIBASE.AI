# Acceptance Notes

## Scope

Adds a focused subscription entitlement downgrade guard for issue #20.

## Non-overlap

This slice focuses on entitlement readiness before downgrade activation, not:

- billing engines
- usage metering
- tax workflows
- revenue disputes
- SLA credits
- partner royalties
- forecast variance
- FX settlement
- plan migration proration
- procurement
- invoice acceptance
- sanctions/export control
- payment rail failover

## Validation

Run:

```bash
node subscription-entitlement-downgrade-guard/test.js
node subscription-entitlement-downgrade-guard/demo.js
```

Expected result:

- Tests print `subscription entitlement downgrade tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough of downgrade holds.
