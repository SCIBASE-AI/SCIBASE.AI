# Revenue Forecast Variance Guard

This is a focused Revenue Infrastructure slice for SCIBASE.AI finance operations. It reconciles forecasted subscription MRR, AI compute usage revenue, cloud costs, and licensing pipeline revenue into one reviewer-ready variance report.

The guard helps finance and product owners decide whether the month can stay on forecast or needs immediate action before invoices, AI compute top-ups, or analytics licensing commitments are treated as reliable revenue.

## What It Checks

- Subscription MRR shortfalls by account and plan.
- Seat underutilization before lab or institutional renewals.
- AI compute cloud-cost overruns and gross-margin floor breaches.
- Quota burn risk for usage-based AI workloads.
- Licensing pipeline slips.
- Privacy and aggregation holds for analytics/API licensing revenue.
- Deterministic audit digests for finance review packets.

## Run Locally

```bash
cd revenue-forecast-variance-guard
npm test
npm run demo
```

The demo writes:

- `docs/demo-output.json`
- `docs/demo.svg`
- `docs/demo.mp4` is included as a short rendered review artifact.

## Scope Differentiation

This avoids duplicating prior generic billing, tax, dispute, SLA credit, renewal, pricing-experiment, procurement, revenue-recognition, and royalty-settlement submissions. The slice is specifically the forecast control layer that decides whether subscription, compute, and licensing revenue are still reliable enough to keep in the active forecast.
