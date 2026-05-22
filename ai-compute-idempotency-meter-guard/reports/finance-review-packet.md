# AI Compute Idempotency Meter Guard

Status: finance_review_required

## Totals
- Raw events: 10
- Idempotency groups: 3
- Collapsed retry rows: 2
- Held rows: 1
- Billable usage: 3.59 cents
- Avoided overbill: 94.46 cents
- Invoice overage: 0.44 cents
- Held invoice accounts: 1
- Audit digest: d99fba495e098133aee15d4f6192b93a85f85257ee5e0a78084c0ef45302b3c8

## Account Decisions
- institute-helix: invoice_overage, Institutional License, institutional_invoice, billable 1.44c, invoice 0.44c, top-up applied 0c, avoided 1c, critical findings 0
- lab-northbridge: covered_by_subscription_or_topup, Lab Pro, card_subscription, billable 2.15c, invoice 0c, top-up applied 0.15c, avoided 2.96c, critical findings 0
- lab-westlake: hold_invoice, Reproducibility Pack, institutional_invoice, billable 0c, invoice 0c, top-up applied 0c, avoided 90.5c, critical findings 2

## Highest-Risk Findings
- critical: rerun_scope_undefined (lab-westlake) - Nondeterministic reproducibility events share an undefined billing scope. Hold the invoice row until finance defines run-vs-verified-output responsibility.
- high: raw_count_inflation (lab-northbridge) - Raw compute events materially exceed distinct account/source/day attribution. Review before invoicing usage counts.
- high: raw_count_inflation (institute-helix) - Raw compute events materially exceed distinct account/source/day attribution. Review before invoicing usage counts.
- critical: rerun_scope_undefined (lab-westlake) - Nondeterministic reproducibility reruns lack a billing-scope policy. Hold charges until run-vs-verified-output responsibility is defined.
