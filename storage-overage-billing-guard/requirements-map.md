# Requirements Map

Issue #20 asks for revenue infrastructure across subscriptions, AI compute/cloud resources, and data licensing. This guard maps to those requirements as follows:

| Issue Area | Coverage |
| --- | --- |
| Tiered subscription billing | Compares private project and dataset snapshot storage against contracted included GB per institutional plan. |
| Usage-based cloud/AI resource pricing | Reconciles reproducibility artifact storage and unmetered external buckets as billable cloud-resource usage. |
| Licensing APIs and analytics | Tracks licensed-export cache storage separately from private project storage with its own rate and quota. |
| Transparent usage meters | Emits per-account usage, overage, charge math, unmetered leakage, and recommended billing actions. |
| Institutional invoicing | Produces invoice-ready or ops-review decisions with charge totals and hold reasons. |
| Privacy and retention safety | Separates stale purge candidates from legal-hold conflicts so revenue recovery does not delete protected data. |

## Acceptance Evidence

- Synthetic-only sample data: `sample-data.js`
- Deterministic evaluator: `index.js`
- Regression tests: `test.js`
- Demo artifacts: `reports/storage-overage-packet.json`, `reports/storage-overage-report.md`, `reports/summary.svg`, `reports/demo.mp4`
