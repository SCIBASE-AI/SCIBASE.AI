# Grandfathered Pricing Migration Guard

This self-contained Revenue Infrastructure slice validates whether a legacy-price customer can be migrated to a new price book before an invoice is released.

The guard focuses on a gap that is separate from existing billing ledgers, usage metering, quota rollover, coupon checks, committed-usage true-ups, grant billing, FX settlement, tax handling, invoice delivery, and analytics-seat licensing work.

## What it checks

- active price locks and grandfathered contract windows
- required customer notice periods before a price increase
- explicit consent for material increases
- annual and volume discount compatibility
- included seat and compute regressions
- add-on parity during plan migration
- currency changes that need finance approval
- dispute, delinquency, and strategic-account review holds
- reviewer evidence such as order forms, runbooks, legal approval, and sales owner signoff

## Run locally

```sh
npm test
npm run demo
```

The demo writes reviewer artifacts under `artifacts/`:

- `pricing-migration-results.json`
- `pricing-migration-report.md`
- `pricing-migration-summary.svg`
- `pricing-migration-demo.mp4` when `swift scripts/make-demo-video.swift artifacts/pricing-migration-demo.mp4` is run on macOS
- `demo-transcript.md`

## Boundaries

All data is synthetic. The module does not call payment processors, customer systems, pricing APIs, bank rails, external services, or private billing records.
