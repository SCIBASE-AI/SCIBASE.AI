# Revenue Evidence Retention Guard

This module adds a focused revenue evidence retention guard for the Revenue Infrastructure bounty in issue #20. It evaluates whether subscription, AI compute, and analytics licensing invoices have enough immutable evidence before revenue is released or booked.

The scope is distinct from generic billing, metering, tax, disputes, SLA credits, partner royalties, forecast variance, FX settlement, plan migration, invoice acceptance, contract allocation, consortium pricing, sanctions/export control, payment rail failover, downgrade, and usage-anomaly credit memo modules.

## What It Checks

- Required evidence by revenue stream: contracts, entitlements, invoices, purchase orders, compute job manifests, meter readings, cost traces, customer usage summaries, license terms, export manifests, and privacy reviews.
- Evidence retention windows by customer segment: individual, lab, institutional, and government.
- Immutability locks through customer dispute windows.
- Evidence root integrity for invoice packets.
- Analytics licensing privacy review approval and private-content exclusion.
- Legal-hold conflicts with queued deletion requests.
- Low evidence replica counts that can still release with controls.

## Run The Demo

From the repository root:

```bash
node revenue-evidence-retention-guard/test.js
node revenue-evidence-retention-guard/demo.js
```

The demo writes JSON, Markdown, and SVG reviewer artifacts under `revenue-evidence-retention-guard/reports/`. This submission also includes `reports/demo.mp4` rendered from the generated review summary.
