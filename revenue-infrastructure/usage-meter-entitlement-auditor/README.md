# Usage Meter Entitlement Auditor

This prototype audits revenue metering for subscription plans, AI compute usage, institutional invoicing, and licensed analytics APIs.

It checks synthetic revenue records for:

- billable usage missing from invoice previews
- AI compute usage above quota without hard-limit enforcement
- discount overrides above revenue policy
- institutional invoices missing purchase order metadata
- analytics API overages without overage billing
- trial accounts consuming paid compute
- plan entitlement mismatches
- duplicated quota top-ups
- private content included in licensed analytics exports
- Stripe, PayPal, and institutional ledger revenue drift

## Run

```sh
node revenue-infrastructure/usage-meter-entitlement-auditor/test.js
node revenue-infrastructure/usage-meter-entitlement-auditor/demo.js
node revenue-infrastructure/usage-meter-entitlement-auditor/make-demo-video.js
```

All fixtures are synthetic. The module performs no payment-provider, bank, tax, account, private-content, credential, or external API access.
