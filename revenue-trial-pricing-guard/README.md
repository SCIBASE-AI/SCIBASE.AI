# Revenue Trial Pricing Guard

This module is a focused Revenue Infrastructure slice for issue #20. It validates free trials, coupons, annual/volume discounts, and consortium pricing before subscription invoices are released.

The guard is intentionally dependency-free and synthetic-data-only. It does not call Stripe, PayPal, invoice providers, wallets, external APIs, or private billing systems.

## What It Checks

- Reused free trials on the same billing identity
- Trial overruns beyond the configured trial window
- Missing conversion evidence before trial-to-paid billing
- Expired coupons
- Coupon-to-plan mismatches
- Consortium discounts used by accounts that fail institution, domain, or minimum-seat requirements
- Non-stackable coupons combined on one invoice
- Annual, volume, coupon, and consortium discounts exceeding the configured discount cap

## Reviewer Commands

```bash
node revenue-trial-pricing-guard/test.js
node revenue-trial-pricing-guard/demo.js
```

The demo writes reviewer artifacts to `revenue-trial-pricing-guard/artifacts/`:

- `demo-output.json`
- `reviewer-report.md`
- `discount-risk-map.svg`
- `trial-pricing-guard-demo.mp4`

## Issue #20 Mapping

- Tiered subscription billing: evaluates plan-specific coupon eligibility, billing cycles, volume discounts, and consortium pricing.
- Free trials and coupons: blocks trial reuse, expired discounts, missing conversion evidence, and unsafe coupon stacking.
- Institutional pricing: verifies consortium eligibility using synthetic institution IDs, seat thresholds, and email domains.
- Invoice safety: emits deterministic `RELEASE_INVOICE`, `REVIEW_BEFORE_RELEASE`, or `HOLD_INVOICE` decisions before invoice release.
- Privacy and safety: uses synthetic fixtures only, with no real customers, secrets, credentials, payment processors, or external services.

## Why This Is Distinct

Existing same-issue slices cover broad billing ledgers, compute metering, tax/VAT, invoice delivery, quota rollover, compute replay, collections, analytics-seat licensing, and data-product freshness. This guard focuses narrowly on discount integrity for trials, coupons, and consortium pricing before invoices leave the platform.
