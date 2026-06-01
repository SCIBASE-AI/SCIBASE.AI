# Requirements Map

Issue #20 asks for revenue infrastructure across subscription billing, usage-based AI compute billing, real-time usage meters, quotas, top-ups, and licensing controls.

This contribution covers a distinct revenue control: validating subscription quota rollover before invoice release.

| Issue capability | Implementation |
| --- | --- |
| Tiered subscription billing | Audits included quota, rollover caps, downgrade carry limits, and plan-change behavior. |
| Usage-based AI compute billing | Reconciles usage units, applied rollover, and expected overage units. |
| Transparent quotas and real-time usage meters | Treats rollover lots and quota adjustments as auditable ledger records. |
| Billing safety before invoice release | Emits `hold-invoice`, `finance-review`, or `ready-to-invoice` decisions with remediation. |
| Reviewer-ready evidence | Generates JSON, Markdown, SVG, and GIF demo artifacts from synthetic data. |

## Non-Overlap

This is not:

- Plan migration proration.
- Subscription renewal notice.
- Entitlement downgrade.
- Usage replay or idempotency.
- Prepaid credit breakage.
- Committed revenue drawdown.
- Quote approval.
- Invoice delivery or collections.
- Analytics-seat/API licensing.

It specifically verifies whether unused monthly subscription quota is carried, expired, capped, adjusted, and applied correctly before overage charges are released.
