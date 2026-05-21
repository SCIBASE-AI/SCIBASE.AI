# Storage Overage Billing Guard

This self-contained revenue control reconciles institutional storage usage against contracted storage quotas before invoice release. It covers private project storage, dataset snapshots, reproducibility artifacts, and licensed-export caches using only synthetic data.

## Why This Matters

SCIBASE subscriptions can bundle storage with private projects, AI/reproducibility artifacts, and licensed analytics exports. If storage buckets are not reconciled before invoicing, the platform can miss recurring revenue, charge stale artifacts that should be purged, or delete data that is under legal hold.

This guard produces a finance-ready decision packet:

- `invoice_ready` when storage overage exceeds the contracted invoice minimum and has clean evidence.
- `hold_for_ops_review` when usage is unmetered, stale, or blocked by a legal/deletion conflict.
- `monitor` when usage stays within quota and no billing action is needed.

## Run

```bash
npm run check
npm test
npm run demo
```

## Outputs

`npm run demo` writes reviewer artifacts to `reports/`:

- `storage-overage-packet.json` with all decisions and charge math.
- `storage-overage-report.md` with a finance-readable summary.
- `summary.svg` with a compact visual dashboard.
- `demo.mp4` with a short static demo video generated alongside the summary SVG.

## Scope

This module is intentionally narrow. It is not a generic billing ledger, seat or renewal true-up engine, payment webhook validator, payment failover module, dispute guard, SLA credit calculator, royalty settlement, revenue forecast, FX reconciliation, procurement control, invoice acceptance gate, sanctions/export-control gate, consortium pricing gate, trial/promotion abuse guard, plan-proration module, or AI compute idempotency meter.

It focuses only on storage overage and retention evidence before storage-related revenue reaches the invoice.
