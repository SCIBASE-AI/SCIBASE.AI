# Issue #20 Requirement Map

## Tiered Subscription Billing

- Preserves all active subscription IDs across duplicate customer profiles.
- Detects duplicate active subscriptions for the same product before double billing or accidental cancellation.
- Emits a survivor-profile draft so finance can choose which subscription remains authoritative.

## AI Compute Billing

- Preserves AI compute credit lots and remaining balances across profile consolidation.
- Flags large or expiring credit balances for finance review before credits move to the survivor account.
- Prevents paid AI usage from becoming detached from payment evidence during merge.

## Licensing APIs And Analytics

- Aggregates dashboard and API seats into the survivor draft for renewal and true-up review.
- Keeps analytics entitlements separate from subscription merge decisions so seat leakage is visible.

## Institutional Invoicing

- Preserves open receivables, paid invoices, and invoice ownership through profile consolidation.
- Blocks legal/tax identity conflicts before invoices and balances are merged.
- Routes unverified payment evidence to finance review before paid features or credits are inherited.

## Review Evidence

- `test.js` covers blocked, finance-review, and ready-to-consolidate outcomes.
- `demo.js` generates deterministic JSON, Markdown, SVG, and MP4 artifacts from synthetic data.
- No live Stripe, PayPal, bank, ACH, ERP, SSO, SCIM, accounting, or customer-data systems are used.
