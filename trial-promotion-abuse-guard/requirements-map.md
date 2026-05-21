# Requirements Map

| Issue #20 requirement | Implementation evidence |
| --- | --- |
| Tiered subscription billing | Validates plan eligibility before discounts are applied to Pro, Lab, or Institution plans. |
| Free trials and coupons | Detects domain/payment trial reuse, disposable-domain trials, missing payment readiness, and coupon stacking. |
| Consortium pricing | Requires active consortium roster evidence before the consortium discount is released. |
| AI compute and top-ups | Checks compute top-up promotion eligibility against paid-plan and verified-payment requirements. |
| Usage and revenue visibility | Emits requested, approved, and prevented discount cents in the generated packet. |
| Institutional auditability | Produces JSON, Markdown, SVG, and demo artifacts from deterministic synthetic data. |

## Scope Boundary

This is not another billing ledger, usage meter, payment webhook validator,
payment failover module, dispute guard, tax exemption gate, SLA credit module,
royalty settlement, revenue forecast, FX reconciliation, procurement control,
invoice acceptance gate, sanctions/export-control gate, consortium roster
engine, plan-proration module, or AI compute idempotency meter.

This slice focuses on the promotion and trial boundary before discounts become
invoice-facing revenue.
