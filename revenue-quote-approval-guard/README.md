# Revenue Quote Approval Guard

Focused slice for SCIBASE issue #20, Revenue Infrastructure.

This module validates institutional quote-to-cash packets before subscriptions, AI compute bundles, analytics licenses, invoices, or entitlements are activated. It is narrower than billing ledgers, usage metering, payment disputes, tax/exemption checks, receipt privacy, renewal notices, grant cost-share controls, sanctions/export checks, analytics seat rosters, or payment authorization freshness.

## What it checks

- Institutional order forms match approved subscription, compute, and analytics license terms.
- Discount, coupon, annual, consortium, and volume pricing approvals are present and fresh.
- Quote totals match invoice line items before revenue is activated.
- Purchase order, legal entity, billing contact, and payment route evidence are complete.
- Entitlements cannot exceed signed quote scope or contract dates.
- Data-license and AI-compute terms include privacy, overage, and margin controls.
- Sales, finance, legal, and sponsor approvals are present for non-standard terms.

## Local verification

```bash
node revenue-quote-approval-guard/test.js
node revenue-quote-approval-guard/demo.js
node revenue-quote-approval-guard/make-demo-video.js
```

Generated reviewer artifacts are written to `revenue-quote-approval-guard/reports/`.

## Safety

Fixtures are synthetic. The module does not call Stripe, PayPal, ERP, CRM, CPQ, bank, wallet, tax, identity, or institutional systems.
