# Grant Cost-Share Revenue Guard

This slice supports issue #20, Revenue Infrastructure. It validates whether
research subscriptions, AI compute usage, and analytics-license charges can be
posted to grant-funded or cost-share billing sources before invoices are issued.

The guard is intentionally synthetic-data-only and dependency-free. It is not a
payment integration. It produces deterministic finance review packets that a
billing workflow can use to approve, hold, or reroute charges.

## What It Checks

- Award and budget-period dates cover the service period.
- The charge category is allowed by the grant or institutional cost-share plan.
- PI or department approval is present when required.
- Cost-share caps and indirect-cost rules are not exceeded.
- Commercial/private-project usage is not charged to restricted funding.
- Backup billing sources are available when a grant source must be held.

## Local Verification

```bash
node revenue-infrastructure/grant-cost-share-guard/test.js
node revenue-infrastructure/grant-cost-share-guard/demo.js
```

The demo writes deterministic reviewer artifacts under
`revenue-infrastructure/grant-cost-share-guard/artifacts/`.

## Files

- `guard.js` - pure decision logic.
- `data/sample-charges.json` - synthetic billing scenarios.
- `test.js` - Node built-in test coverage.
- `demo.js` - deterministic artifact generator.
- `artifacts/decision-report.json` - generated machine-readable decisions.
- `artifacts/decision-report.md` - generated reviewer summary.
- `artifacts/decision-flow.svg` - generated workflow diagram.
