# Billing Readiness Guard

This module adds a deterministic, dependency-free billing guard for SCIBASE issue #20. It previews subscription, usage-based AI compute, storage, API, and anonymized analytics licensing charges before any payment-provider handoff.

## Scope

- Tiered subscription and seat overage preview
- AI token, compute-hour, storage, and licensing API usage overages
- Budget-cap and usage-spike review
- Payment path, tax profile, purchase order, and contract checks
- Aggregate-anonymized licensing safeguards for private research content
- Deterministic invoice digest and reviewer remediation actions

All fixtures are synthetic. The module does not use Stripe, PayPal, bank, customer, tax, contract, private research content, credentials, or external APIs.

## Run

```bash
node revenue-infrastructure/billing-readiness-guard/test.js
node revenue-infrastructure/billing-readiness-guard/demo.js
node revenue-infrastructure/billing-readiness-guard/make-demo-video.js
```

Generated billing review artifacts are written to `reports/`.
