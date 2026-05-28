# Acceptance Notes

The implemented slice is intentionally distinct from existing #20 submissions:

- It is not another subscription ledger, metering ledger, proration guard, renewal true-up, tax exemption module, SLA credit guard, FX settlement guard, dispute guard, receipt privacy guard, cost-share guard, account transfer guard, or analytics usage guard.
- It focuses on institutional/government customer eligibility before invoices, payment-rail handling, AI compute bundles, and analytics license exports are activated.
- It is synthetic-data-only and does not call live sanctions, payment, bank, identity, or customer systems.

Validation targets:

- restricted-party and restricted-jurisdiction requests hold invoices and entitlements
- export-controlled compute without clearance creates a high-priority task
- unsupported payment rails route to manual billing review
- eligible institutional customers can activate revenue
- buyer contacts and tax identifiers are redacted from outputs
- summary counts and audit digest are deterministic
