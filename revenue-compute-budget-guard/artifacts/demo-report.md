# Compute Budget Guard Report

Generated: 2026-06-06T00:00:00Z
Portfolio: revenue-infra-demo

## Totals

- Metered compute spend: $2633.00
- Approved budget plus top-ups: $9150.00
- Approved invoiceable amount: $2478.00

## Account Decisions

### lab-clear-001

- Decision: CLEAR_TO_BILL
- Plan: Research Lab Pro
- Spend: $780.00 of $7000.00 budget
- Top-up credit: $0.00
- Projected spend: $4680.00

No findings.

### lab-warning-002

- Decision: SEND_NOTICE_BEFORE_BILLING
- Plan: Institutional AI Compute
- Spend: $798.00 of $1000.00 budget
- Top-up credit: $250.00
- Projected spend: $4788.00

- [HIGH] BUDGET_THRESHOLD_NOTICE_STALE: Budget threshold was crossed without a fresh customer notice.
  - Remediation: Send or refresh the budget threshold notice before billing the overage.

### lab-hold-003

- Decision: HOLD_COMPUTE_BILLING
- Plan: Enterprise Compute
- Spend: $1055.00 of $800.00 budget
- Top-up credit: $100.00
- Projected spend: $6330.00

- [HIGH] BUDGET_NOTICE_CONTACTS_MISSING: Budget threshold was crossed, but the account does not have enough notice recipients.
  - Remediation: Add finance or account-owner recipients before releasing the compute invoice.
- [HIGH] BUDGET_THRESHOLD_NOTICE_STALE: Budget threshold was crossed without a fresh customer notice.
  - Remediation: Send or refresh the budget threshold notice before billing the overage.
- [CRITICAL] HARD_CAP_WITHOUT_BILLING_HOLD: Compute usage reached the hard-cap threshold but billing hold controls are not enabled.
  - Remediation: Enable billing hold or record an explicit finance override before invoice release.
- [CRITICAL] UNCOVERED_COMPUTE_OVERAGE: Compute spend exceeds the approved budget plus prepaid top-up balance.
  - Remediation: Hold the invoice, request top-up authorization, or cap the billable amount to the approved limit.
- [HIGH] COMPUTE_INVOICE_AMOUNT_MISMATCH: Draft compute invoice does not match the approved billable amount.
  - Remediation: Regenerate the invoice from the metered usage ledger and approved budget/top-up limit.

