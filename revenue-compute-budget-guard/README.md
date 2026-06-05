# Revenue Compute Budget Guard

This module adds an audit-ready guard for the AI compute billing stream in
SCIBASE revenue infrastructure. It checks whether metered compute usage can be
released to billing before customer budget notices, top-up coverage, and hard
cap controls are satisfied.

The guard is intentionally dependency-free and uses synthetic sample data only.
It does not connect to payment processors, external APIs, customer accounts, or
private billing data.

## What It Covers

- Account-level compute spend from billable usage events
- Approved budget plus prepaid top-up balance
- Warning and critical threshold decisions
- Freshness of customer budget notices
- Missing finance/account-owner notification recipients
- Hard-cap billing hold enforcement
- Draft invoice amount mismatches
- Reviewer-ready JSON and Markdown evidence output

## Decisions

| Decision | Meaning |
| --- | --- |
| `CLEAR_TO_BILL` | Spend is within approved controls and invoice amount matches the ledger. |
| `SEND_NOTICE_BEFORE_BILLING` | Billing can proceed only after warning/projection notice issues are remediated. |
| `HOLD_COMPUTE_BILLING` | Critical overage, missing budget, or hard-cap control gaps block invoice release. |

## Run Locally

```bash
node revenue-compute-budget-guard/test.js
node revenue-compute-budget-guard/demo.js
```

The demo writes:

- `revenue-compute-budget-guard/artifacts/demo-output.json`
- `revenue-compute-budget-guard/artifacts/demo-report.md`

## Requirement Map

| Issue #20 revenue infrastructure requirement | Implementation |
| --- | --- |
| Usage-based pricing for heavy backend processing tasks | `usageEvents` are metered into billable compute spend. |
| Transparent quotas and real-time usage meters | Budget, spend ratio, projected period-end spend, and allowed invoice amount are returned per account. |
| Bundle tokens or allow top-ups | `topUpBalanceCents` is included in the approved spend limit and overage decision. |
| Institutional billing governance | Draft invoice mismatch and hard-cap hold findings create reviewer-ready finance remediation evidence. |
| No live payment or credential handling | The module is dependency-free and runs only on synthetic JSON sample data. |
