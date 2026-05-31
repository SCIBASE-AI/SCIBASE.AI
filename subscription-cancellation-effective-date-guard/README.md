# Subscription Cancellation Effective-Date Guard

This is a focused Revenue Infrastructure slice for issue #20. It evaluates
subscription cancellation packets before entitlements, AI compute credits,
analytics licenses, and renewal invoices are changed.

The guard uses synthetic data only and has no external service dependencies.

## Checks

- Cancellation requests submitted after the contractual notice window.
- Cancellation effective dates that do not match the contract end date.
- Renewal invoices that are still scheduled after cancellation.
- Refund or service-credit obligations that have no finance review.
- AI compute credits that would remain usable after the wind-down date.
- Analytics-license exports that continue past the cancellation cutoff.
- Institutional purchase-order exceptions that require manual handling.

## Local Verification

```bash
node subscription-cancellation-effective-date-guard/test.js
node subscription-cancellation-effective-date-guard/demo.js
```

Demo artifacts are written to
`subscription-cancellation-effective-date-guard/reports/`.

## Issue #20 Mapping

This targets the subscription billing, AI compute billing, and analytics
licensing layers in issue #20. It is distinct from renewal notice, trial abuse,
dunning, downgrade, payment authorization, account transfer, collections,
receipt privacy, quote approval, sanctions, and analytics seat roster slices.
