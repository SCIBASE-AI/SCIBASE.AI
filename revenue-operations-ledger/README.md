# Revenue Operations Ledger

This module is a credential-free revenue infrastructure milestone for
SCIBASE.AI issue #20. It models tiered subscriptions, usage metering, top-up
ledgering, entitlement decisions, anonymized analytics licensing, institutional
invoice summaries, and revenue health reporting.

The implementation is deterministic so reviewers can run it without Stripe,
PayPal, banking, or cloud credentials.

## What It Demonstrates

- Tiered subscription quotes for Individual Pro, Lab, and Institution plans.
- Monthly and annual billing cycles with annual, coupon, and volume discounts.
- AI inference, reproducibility compute, and storage usage metering.
- Replayable top-up ledger for usage credits.
- Entitlement decisions for AI jobs, compute overages, private projects, and
  support tiers.
- Anonymized analytics licensing packages that explicitly exclude private
  project content.
- Institutional invoice summaries with supported payment rails.
- Revenue health rollups across generated invoices.

## Run The Demo

```bash
npm test
npm run demo
```

The demo prints a complete JSON report for a research consortium account:

```bash
node src/demo.js
```

Expected highlights:

- `subscriptionQuote.totalUsd` reflects annual, consortium, and volume
  discounts.
- `usageInvoice.spendUsd.total` combines AI inference, reproducibility compute,
  and storage charges.
- `licensingPackage.deniedDatasetIds` proves private content is excluded from
  the analytics product.
- `invoice.invoiceId` is deterministic and replayable from the inputs.

## Local API

```bash
npm run api
curl http://localhost:4210/health
curl http://localhost:4210/demo-report
```

The API is intentionally read-only and local. It is a reviewer surface, not a
payment processor.

## Demo Artifact

![Revenue operations demo](docs/demo.gif)

## Safety Notes

- No payment information is collected.
- No external payment provider SDKs are imported.
- No private research content is included in licensing exports.
- Entitlement decisions are derived from replayable ledger inputs, making them
  suitable for audit logs and billing support.
