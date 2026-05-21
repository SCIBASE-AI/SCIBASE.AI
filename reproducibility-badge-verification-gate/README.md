# Reproducibility Badge Verification Gate

Self-contained community and reputation module for SCIBASE issue #15.

The gate evaluates whether a project should receive a primary reproducibility badge based on independent reproduction evidence. It checks required artifact hashes, executable environment digests, output matches, test results, run-log checksums, conflict disclosures, author/collaborator conflicts, and the number of valid independent reproduction runs required for bronze, silver, or gold badges.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts to `reports/`:

- `reproducibility-badge-packet.json`
- `reproducibility-badge-report.md`
- `summary.svg`
- `demo.mp4`

## Scope

This slice is intentionally narrow. It does not implement leaderboards, badge renewal, endorsement rings, review civility, review timeliness credits, mentorship scoring, anonymous identity escrow, or broad reputation transparency receipts. It focuses on primary badge issuance from independently verified reproducibility evidence.
