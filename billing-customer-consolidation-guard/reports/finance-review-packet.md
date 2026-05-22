# Billing Customer Consolidation Guard

Institution: inst-northbridge
Decision: block-consolidation
Generated: 2026-05-22T15:00:00Z

## Survivor Draft

- Survivor profile: bill-northbridge-primary
- Profiles merged: bill-northbridge-primary, bill-northbridge-lab
- Subscriptions preserved: sub-pro-01, sub-lab-77
- Invoices preserved: inv-100, inv-101
- Open receivables: $4200.00
- Preserved credit balance: $0.00
- Analytics seats: 0 dashboard, 0 API

## Findings

- **critical** legal-entity-conflict: Duplicate billing profiles resolve to conflicting legal names or tax identifiers.
- **high** open-receivable-preservation: Open invoice balances must remain traceable after profile consolidation.

## Required Actions

- route_to_finance_legal_review (inst-northbridge): legal entity identity must be resolved before invoices, credits, or entitlements merge
- preserve_open_receivables (bill-northbridge-primary): AR balances, due dates, and invoice ownership must survive billing profile merge

---
# Billing Customer Consolidation Guard

Institution: inst-riverton
Decision: finance-review
Generated: 2026-05-22T15:00:00Z

## Survivor Draft

- Survivor profile: bill-riverton-main
- Profiles merged: bill-riverton-main, bill-riverton-shadow
- Subscriptions preserved: sub-main, sub-shadow
- Invoices preserved: inv-shadow
- Open receivables: $900.00
- Preserved credit balance: $2000.00
- Analytics seats: 26 dashboard, 7 API

## Findings

- **high** duplicate-active-subscription: More than one active subscription exists for the same revenue product.
- **high** credit-balance-transfer-required: Compute credit balances need explicit survivor-account transfer evidence.
- **high** unverified-payment-evidence: One or more merged profiles has unverified payment evidence.
- **medium** open-receivable-preservation: Open invoice balances must remain traceable after profile consolidation.

## Required Actions

- choose_surviving_subscription (bill-riverton-main): finance must prevent double billing or accidental entitlement loss before merge
- preserve_credit_lots (bill-riverton-main): prepaid or expiring compute credits must not disappear during customer consolidation
- verify_payment_evidence (bill-riverton-shadow): survivor profile should not inherit paid features from unverified payment records
- preserve_open_receivables (bill-riverton-shadow): AR balances, due dates, and invoice ownership must survive billing profile merge

---
# Billing Customer Consolidation Guard

Institution: inst-eastlake
Decision: ready-to-consolidate
Generated: 2026-05-22T15:00:00Z

## Survivor Draft

- Survivor profile: bill-eastlake-main
- Profiles merged: bill-eastlake-main, bill-eastlake-legacy
- Subscriptions preserved: sub-eastlake-lab, sub-eastlake-compute
- Invoices preserved: inv-eastlake-paid
- Open receivables: $0.00
- Preserved credit balance: $500.00
- Analytics seats: 7 dashboard, 1 API

No blocking billing consolidation risks detected.
