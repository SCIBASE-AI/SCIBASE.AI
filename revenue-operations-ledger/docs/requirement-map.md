# Requirement Map

| Issue #20 requirement | Implementation |
| --- | --- |
| Tiered subscription billing | `quoteSubscription()` defines Individual Pro, Lab, and Institution plans with monthly/annual cycles, coupons, and volume discounts. |
| Individual, lab, and institutional plans | `PLAN_CATALOG` includes plan-specific AI credits, compute hours, private project limits, and support tiers. |
| Usage-based AI compute billing | `meterUsage()` prices `ai_inference` and `reproducibility_job` events from a deterministic rate card. |
| Transparent quotas and usage meters | `meterUsage()` returns per-stream totals; `decideEntitlements()` compares usage to included quotas and top-ups. |
| Top-ups and bundled tokens | `applyTopUps()` replays purchases and debits into a closing credit balance. |
| Licensing APIs and analytics | `packageAnalyticsLicense()` packages anonymized metadata datasets and excludes private content. |
| Institutional invoicing and payment options | `buildInstitutionalInvoice()` emits line items and supported rails for Stripe, PayPal, and institutional invoice workflows without integrating credentials. |
| Revenue health reporting | `summarizeRevenueHealth()` rolls invoices into totals, largest line items, and risk flags. |
| Reviewer-friendly demo/API | `src/demo.js` prints a complete report; `src/api.js` serves `/health` and `/demo-report`. |
| Tests | `test/revenue-ledger.test.js` covers quotes, metering, top-ups, entitlements, licensing privacy, and invoice health. |
