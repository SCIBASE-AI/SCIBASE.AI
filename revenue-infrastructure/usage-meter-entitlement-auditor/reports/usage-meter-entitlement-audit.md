# Usage Meter Entitlement Audit: Northstar Translational Lab

- Decision: hold-revenue-close
- Risk score: 100
- Usage events reviewed: 4
- Invoices reviewed: 2
- Licensing exports reviewed: 1
- Compute usage: 1220/1200
- Audit digest: 6facc076fcf01220

## Findings

- [high] USAGE_NOT_BILLED
  - usage-002 is billable but missing from invoice usage references.
  - Recommendation: Backfill usage into the current invoice preview or create an adjustment line.
- [medium] USAGE_NOT_BILLED
  - usage-003 is billable but missing from invoice usage references.
  - Recommendation: Backfill usage into the current invoice preview or create an adjustment line.
- [high] FREE_TRIAL_COMPUTE_LEAK
  - usage-003 consumed paid compute beyond trial entitlement.
  - Recommendation: Block paid compute features when trial entitlements are exhausted.
- [high] LICENSED_API_OVERAGE
  - usage-004 exceeded licensed analytics API allowance without overage billing.
  - Recommendation: Bill analytics API overage or throttle the license key.
- [critical] OVER_QUOTA_NOT_BLOCKED
  - Compute usage 1220 exceeds quota 1200 without hard-limit enforcement.
  - Recommendation: Enforce compute quota gates before allowing additional jobs.
- [high] PLAN_ENTITLEMENT_MISMATCH
  - Active private projects 9 exceed lab plan limit 6.
  - Recommendation: Reconcile plan entitlements with subscription tier before charging usage.
- [medium] TOPUP_DOUBLE_COUNTED
  - Top-up topup-002 duplicates topup-001.
  - Recommendation: Deduplicate top-up credits before producing quota or invoice totals.
- [high] DISCOUNT_EXCEEDS_POLICY
  - Invoice inv-001 applies 35% discount above policy 20%.
  - Recommendation: Require revenue-ops approval for discount overrides above policy.
- [high] INSTITUTIONAL_PO_MISSING
  - Institutional invoice inv-001 is missing purchase order metadata.
  - Recommendation: Hold invoice finalization until purchase order metadata is attached.
- [critical] PRIVATE_CONTENT_LICENSED
  - Analytics export export-001 includes disallowed private fields: private_project_title, raw_content_excerpt.
  - Recommendation: Remove private-content fields from analytics licensing exports.
- [medium] PAYMENT_PROVIDER_DRIFT
  - Payment provider revenue totals differ by $230.00.
  - Recommendation: Reconcile Stripe, PayPal, and invoice ledger totals before revenue close.

## Reconciliation Gates

- [!] All billable usage appears on invoice previews.
- [!] Compute usage cannot exceed quota without enforcement.
- [!] Institutional invoices include purchase order metadata.
- [!] Analytics licensing exports exclude private content.
- [!] Payment provider totals reconcile before close.
