# Requirement Map

| Issue requirement | Implementation |
| --- | --- |
| Tiered subscription billing | Evaluates current and target plans, price books, billing cycles, included seats, and included compute. |
| Volume discounts and annual cycles | Blocks or reviews incompatible annual commitments, volume discounts, seat caps, and billing-cycle regressions. |
| Free trials, coupons, consortium pricing coexistence | Keeps this slice distinct by checking plan migration release readiness rather than coupon eligibility itself. |
| Institutional invoicing | Produces deterministic RELEASE, REVIEW, or HOLD decisions before legacy-price invoices can be released. |
| Usage-based pricing for AI compute | Detects target plan compute regressions against recent average compute usage. |
| Transparent quotas and usage meters | Includes included-seat and compute-hour deltas in every reviewer result. |
| High-margin, predictable recurring revenue | Prevents surprise migrations, missing consent, active price-lock violations, and add-on parity regressions before invoices ship. |
| Reviewer-ready evidence | Demo script generates JSON, Markdown, SVG, and transcript artifacts from synthetic account packets. |
| Safe contribution boundary | No payment processor calls, no live customers, no credentials, no external APIs, and no private billing records. |

## Distinct slice statement

This contribution is focused only on grandfathered-price and price-book migration release decisions. It intentionally does not implement generic subscriptions, payment collection, quota rollover, tax/VAT, dunning, FX settlement, grant compute budgets, committed-usage true-ups, analytics-seat licensing, invoice delivery, or coupon eligibility.
