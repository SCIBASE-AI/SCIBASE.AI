# Payment Authorization Freshness Guard Report

Batch: revenue-payment-auth-demo
Generated at: 2026-05-23T09:30:00Z
Decision: block-unsafe-charges
Authorization score: 0
Findings: 8
Required actions: 8
Audit digest: e99c8ba0ed28b1cc

## Summary

- Requests reviewed: 4
- Blocked charges: 2
- Review charges: 1
- Expired instruments: 1
- Stale mandates: 1
- Authorization issues: 2
- Variance issues: 2

## Findings

- blocker: expired-payment-instrument on charge-expired-card - Saved card expired at 2026-04-30.
- blocker: stale-sca-mandate on charge-expired-card - SCA authentication age is 295.4 days, above 180 days.
- blocker: unsafe-charge-release on charge-expired-card - Charge release is blocked until payment authorization freshness issues are resolved.
- major: missing-debit-mandate on charge-ach-scope - ACH/direct-debit charge lacks signed debit authorization evidence.
- major: mandate-scope-mismatch on charge-ach-scope - Mandate does not cover ai_compute_topup.
- blocker: amount-variance-without-notice on charge-variance - Charge amount variance is 40.0%, above 10% without customer notice.
- blocker: currency-variance-without-notice on charge-variance - Charge currency EUR differs from authorized USD without customer notice.
- blocker: unsafe-charge-release on charge-variance - Charge release is blocked until payment authorization freshness issues are resolved.

## Required Actions

- collect_updated_payment_method for charge-expired-card (billing_ops)
- refresh_sca_mandate for charge-expired-card (billing_ops)
- hold_charge_release for charge-expired-card (finance_ops)
- collect_debit_mandate for charge-ach-scope (finance_ops)
- update_mandate_scope for charge-ach-scope (finance_ops)
- send_customer_charge_notice for charge-variance (billing_ops)
- reauthorize_currency for charge-variance (billing_ops)
- hold_charge_release for charge-variance (finance_ops)
