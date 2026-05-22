# Billing Customer Consolidation Guard

Self-contained Revenue Infrastructure slice for issue #20. It evaluates duplicate billing/customer profiles inside one institution before subscriptions, AI compute credits, analytics seats, invoices, coupons, tax identities, and payment evidence are consolidated.

## What It Checks

- Legal name and tax ID conflicts before customer records merge.
- Duplicate active subscriptions for the same revenue product.
- Large or expiring AI compute credit balances that need explicit survivor-account transfer.
- Unverified payment evidence that should not unlock paid entitlements.
- Open receivables that must remain traceable after consolidation.
- Analytics dashboard and API seat totals for survivor-account true-up.

## Outputs

- `reports/consolidation-packet.json`: structured decisions, findings, survivor-account drafts, and finance actions.
- `reports/finance-review-packet.md`: readable finance review packet for every synthetic scenario.
- `reports/summary.svg`: visual decision summary.
- `reports/demo.mp4`: short demo artifact for Algora review.

## Local Verification

```bash
node --test billing-customer-consolidation-guard/test.js
node billing-customer-consolidation-guard/demo.js
node --check billing-customer-consolidation-guard/index.js
node --check billing-customer-consolidation-guard/sample-data.js
node --check billing-customer-consolidation-guard/demo.js
node --check billing-customer-consolidation-guard/test.js
```

The module is dependency-free, uses synthetic data only, and makes no network calls. Set `FFMPEG_PATH` to an ffmpeg binary before running `demo.js` if regenerating `reports/demo.mp4`.
