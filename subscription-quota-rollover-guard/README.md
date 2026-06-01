# Subscription Quota Rollover Guard

This slice adds a dependency-free Revenue Infrastructure guard for subscription AI-compute or token quota rollover. It audits synthetic quota ledgers before invoice release so SCIBASE can avoid double billing, expired quota application, and unsupported carry-forward during plan changes.

The scope is intentionally distinct from existing same-issue submissions for proration, renewal notice, entitlement downgrade, usage replay/idempotency, prepaid credit breakage, committed drawdown, quote approval, invoice delivery, tax, collections, analytics-seat leakage, and payment authorization freshness.

## What It Checks

- Carry-forward units exceeding the plan rollover cap.
- Posted rollover totals that do not match prior-cycle unused quota.
- Duplicate rollover lot identifiers.
- Expired rollover lots applied to the current invoice.
- Applied units that do not reconcile to lot-level records.
- Plan downgrade carry limits.
- Unapproved negative quota adjustments.
- Overage line items that fail to subtract applied rollover.
- Missing finance hold when blockers exist.

## Reviewer Output

Running the demo creates:

- `reports/quota-rollover-report.json`
- `reports/quota-rollover-report.md`
- `reports/summary.svg`
- `reports/demo-script.txt`
- `reports/demo.gif`
- `reports/demo.mp4`

All inputs are synthetic. The guard uses no credentials, private customer data, payment processors, live billing systems, analytics APIs, or external services.

## Commands

```bash
npm test
npm run demo
npm run demo:video
```
