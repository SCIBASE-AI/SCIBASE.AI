# Requirement Map

| Issue #20 requirement | Implementation evidence |
| --- | --- |
| Tiered SaaS billing | `buildPlanCatalog` models individual, lab, and institutional plans. |
| Monthly and annual cycles | `priceSubscription` supports monthly and annual billing periods. |
| Volume discounts and auto-scaling plans | `calculateSeatPrice` applies seat-based discounts. |
| Free trials, coupons, consortium pricing | `applyPromotion` handles trial, coupon, and consortium discounts. |
| Secure payment integrations | `buildPaymentIntent` emits Stripe, PayPal, and invoice provider metadata without making live calls. |
| AI compute billing | `meterComputeUsage` calculates usage charges for inference, training, reproducibility, and deployment tasks. |
| Quotas and top-ups | `buildEntitlements` and `applyTopUps` model quotas and added credits. |
| Transparent invoices | `buildInvoice` creates subscription, usage, discount, tax, and total lines. |
| Licensing APIs and analytics | `buildAnalyticsLicenseExport` produces anonymized metadata-only exports. |
| Revenue reporting | `buildRevenueReport` summarizes recurring, usage, top-up, licensing, and invoice health. |
