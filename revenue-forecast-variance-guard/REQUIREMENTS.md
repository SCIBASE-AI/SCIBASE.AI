# Requirement Map

This module targets the Revenue Infrastructure bounty by adding a finance-control slice that is distinct from billing engines, tax handling, dispute guards, renewals, SLA credits, pricing experiments, and royalty settlement.

| Issue requirement | Evidence in this module |
| --- | --- |
| Tiered subscription billing | `evaluateSubscriptions` compares forecast MRR, actual MRR, seat utilization, and renewal confidence across individual, lab, and institutional plans. |
| AI compute billing | `evaluateComputeUsage` checks forecasted usage revenue, actual compute revenue, cloud cost variance, quota burn, and gross-margin floors. |
| Licensing APIs and analytics | `evaluateLicensingDeals` risk-adjusts licensing forecast revenue and blocks revenue recognition when privacy or aggregation gates fail. |
| Predictable recurring revenue | `buildRevenueForecastReport` rolls subscriptions, compute, and licensing into a single forecast variance report with status, actions, and an audit digest. |
| Reviewer-ready evidence | `test.js` validates known risk scenarios and ready-state behavior. `demo.js` writes a JSON report and SVG demo artifact. |

The output is synthetic-data-only and dependency-free. It does not contact payment providers, analytics customers, or external services.
