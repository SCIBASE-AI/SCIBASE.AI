# Revenue Operations Ledger

Self-contained implementation milestone for [SCIBASE.AI issue #20](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/20).

It models flexible revenue infrastructure for a research SaaS platform:

- tiered subscription plans for individual, lab, and institutional customers
- monthly and annual billing cycles
- free trials, coupons, consortium pricing, volume discounts, and seat scaling
- payment-provider metadata for Stripe, PayPal, and institutional invoicing
- AI compute usage meters for inference, training, reproducibility checks, and deployments
- top-up ledger and entitlement checks
- transparent invoice generation
- anonymized analytics licensing exports that exclude private content
- revenue health reporting
- dependency-free JSON API/demo server

## Run

```bash
cd revenue-operations-ledger
npm run check
npm test
npm start
```

Open `http://localhost:4326` or inspect:

```bash
curl -s http://localhost:4326/api/plans
curl -s http://localhost:4326/api/subscription
curl -s http://localhost:4326/api/usage
curl -s http://localhost:4326/api/invoice
curl -s http://localhost:4326/api/licensing
curl -s http://localhost:4326/api/report
```

## Implementation Notes

The module avoids live payment calls. It keeps provider metadata, invoice state, and entitlement logic explicit so Stripe, PayPal, or institutional invoice adapters can be attached later without changing billing policy behavior.

## Files

- `src/revenue.js` - plans, pricing, metering, top-ups, invoices, entitlements, licensing, and reporting.
- `src/sample-data.js` - representative customer, plans, usage, coupon, top-up, and licensing fixtures.
- `src/server.js` - local API and reviewer dashboard.
- `test/revenue.test.js` - Node tests for revenue workflows.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The implementation and tests were run locally before submission.
