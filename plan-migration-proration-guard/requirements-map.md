# Requirement Map

Issue #20 asks for modular revenue infrastructure spanning subscription billing, AI compute billing, secure payment readiness, institutional invoicing, and licensing analytics. This slice targets a narrow operational gap inside that revenue system: mid-term plan migration and proration controls.

| Issue requirement | Coverage in this module |
| --- | --- |
| Tiered subscription billing | Models current and target plans with interval, seats, unit price, term dates, and approved plan IDs. |
| AI compute usage and top-ups | Tracks AI compute credit carryover and holds migrations that exceed a configurable carryover cap. |
| Institutional invoices | Requires invoice IDs for positive migration charges, detects duplicate invoice IDs, and calculates net invoice/credit memo cents. |
| Secure payment integrations | Requires quote acceptance and payment readiness evidence for trial-to-paid migrations before downstream payment rails are touched. |
| Predictable recurring revenue | Calculates annualized revenue delta and blocks seat-floor violations that would erode committed ARR. |
| Discounts, plan changes, and account lifecycle | Handles upgrades, downgrades, trial conversions, seat changes, large invoice approvals, and credit memo approvals. |
| Compliance and audit readiness | Emits deterministic audit digests, blocker/hold findings, and recommended finance actions for each migration. |

## Non-Goals

- Does not integrate with Stripe, PayPal, banks, or Algora.
- Does not store real customer, invoice, or payment data.
- Does not duplicate existing revenue dispute, SLA credit, pricing experiment, committed drawdown, forecast, tax, procurement, renewal, margin, or partner royalty modules.
