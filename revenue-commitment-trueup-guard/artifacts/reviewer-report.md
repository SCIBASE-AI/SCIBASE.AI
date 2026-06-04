# Revenue Commitment True-Up Guard Report

Generated: 2026-06-04T07:17:36.824Z
Portfolio: synthetic-enterprise-commitments

## Summary

- Contracts reviewed: 6
- Invoices reviewed: 7
- Release: 2
- Review before release: 1
- Hold invoice: 4
- Absolute true-up variance: $4200.00

## Invoice Decisions

| Contract | Invoice | Action | Expected true-up | Proposed true-up | Findings |
| --- | --- | --- | ---: | ---: | --- |
| ENT-CLEAN-2026 | INV-CLEAN-Q1 | RELEASE_INVOICE | $2250.00 | $2250.00 | none |
| ENT-UNDERTRUE-2026 | INV-UNDER-Q1 | HOLD_INVOICE | $2800.00 | $1500.00 | TRUEUP_VARIANCE |
| ENT-DUPLICATE-2026 | INV-DUP-Q1-A | RELEASE_INVOICE | $800.00 | $800.00 | none |
| ENT-DUPLICATE-2026 | INV-DUP-Q1-B | HOLD_INVOICE | $150.00 | $150.00 | DUPLICATE_TRUEUP_WINDOW |
| ENT-AMENDMENT-2026 | INV-AMEND-Q1 | HOLD_INVOICE | $1900.00 | $0.00 | MISSING_BASE_EVIDENCE, TRUEUP_VARIANCE, FUTURE_AMENDMENT_APPLIED_EARLY |
| ENT-SLA-2026 | INV-SLA-Q1 | HOLD_INVOICE | $200.00 | $1000.00 | TRUEUP_VARIANCE, MISSING_SLA_TICKET, SLA_CREDIT_EXCEEDS_CAP |
| ENT-REVIEW-2026 | INV-REVIEW-Q1 | REVIEW_BEFORE_RELEASE | $800.00 | $1000.00 | TRUEUP_VARIANCE, MISSING_SLA_TICKET |

## Reviewer Notes

- All data is synthetic and credential-free.
- `HOLD_INVOICE` means a finance or revenue-ops blocker should be resolved before release.
- `REVIEW_BEFORE_RELEASE` means release is possible after a documented finance check.
