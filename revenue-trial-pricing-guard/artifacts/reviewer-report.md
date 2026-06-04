# Trial/Coupon/Consortium Pricing Guard Report

Invoice date: 2026-06-04

## Portfolio Summary

- Accounts evaluated: 5
- Released invoices: 1
- Review holds: 0
- Blocked invoices: 4
- Net invoice amount: $58757.96
- Discount risk detected: $44378.50

## Account Decisions

| Account | Action | Net invoice | At risk | Finding codes |
| --- | --- | ---: | ---: | --- |
| acct-clean-lab | RELEASE_INVOICE | $6825.60 | $0.00 | none |
| acct-repeat-trial | HOLD_INVOICE | $46.40 | $136.30 | trial_reuse, trial_overrun, missing_conversion_evidence, coupon_missing_conversion_evidence |
| acct-expired-coupon | HOLD_INVOICE | $729.96 | $142.20 | expired_coupon |
| acct-consortium-mismatch | HOLD_INVOICE | $19404.00 | $12348.00 | consortium_ineligible, discount_cap_exceeded |
| acct-stack-conflict | HOLD_INVOICE | $31752.00 | $31752.00 | non_stackable_coupon_combo, discount_cap_exceeded |

## Revenue Infrastructure Mapping

- Tiered subscription billing: checks plan-level coupon eligibility, billing cycle discounts, and seat-volume conflicts.
- Free trials and coupons: blocks reused trials, expired coupons, missing trial-conversion evidence, and non-stackable coupon combinations.
- Consortium pricing: verifies institution/domain/seat eligibility before discount release.
- Invoice safety: emits deterministic RELEASE_INVOICE, REVIEW_BEFORE_RELEASE, or HOLD_INVOICE actions before billing leaves the platform.
- Privacy: uses synthetic fixtures only; no payment processor calls, customer identifiers, credentials, or external APIs.
