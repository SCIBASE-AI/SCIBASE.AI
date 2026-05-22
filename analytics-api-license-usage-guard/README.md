# Analytics API License Usage Guard

This module provides a focused Revenue Infrastructure slice for SCIBASE issue
#20. It validates paid analytics API customers before graph metadata queries are
served or billed.

## What It Covers

- License tier and active-license checks.
- Dataset and topic entitlement checks.
- Anonymization threshold enforcement for metadata-only exports.
- Private-content blocking.
- Monthly quota and overage authorization checks.
- Per-minute burst throttling.
- Deterministic revenue and audit packets for usage dashboards.

## Run

```bash
npm run check
npm test
npm run demo
```

Generated artifacts are written to `reports/`:

- `summary.json`
- `reviewer-packet.md`
- `summary.svg`
- `demo.mp4`

All data is synthetic and does not call Stripe, PayPal, customer systems, live
billing providers, or private analytics stores.
