# Resumable Upload Checkpoint Guard

Self-contained Scientific/Engineering Data & Code Hosting slice for issue #14. It validates multipart upload checkpoint evidence before scientific datasets, notebooks, and supplements become durable hosted artifacts.

## What It Checks

- Contiguous chunk coverage from index `0` through the expected final chunk.
- Per-chunk declared checksum versus observed checksum evidence.
- Final artifact manifest hash before commit.
- DataCite/schema.org metadata schema readiness.
- Expired checkpoint state that must be restarted instead of resumed.

## Outputs

- `reports/upload-checkpoint-packet.json`: structured reviewer decisions and findings.
- `reports/checkpoint-report.md`: readable report for each synthetic upload scenario.
- `reports/summary.svg`: visual summary of commit, hold, and abort decisions.
- `reports/demo.mp4`: short demo artifact for Algora review.

## Local Verification

```bash
node resumable-upload-checkpoint-guard/test.js
node resumable-upload-checkpoint-guard/demo.js
node --check resumable-upload-checkpoint-guard/index.js
node --check resumable-upload-checkpoint-guard/test.js
node --check resumable-upload-checkpoint-guard/demo.js
node --check resumable-upload-checkpoint-guard/sample-data.js
```

The module is dependency-free, uses synthetic data only, and makes no network calls.
