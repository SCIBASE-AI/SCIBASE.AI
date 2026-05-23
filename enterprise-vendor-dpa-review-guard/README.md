# Enterprise Vendor DPA Review Guard

This module adds a focused Enterprise Tooling guard for institutional vendor and integration enablement. It evaluates synthetic third-party vendor requests before admins enable integrations, webhooks, or export destinations.

It checks:

- active DPA coverage and accountable owner assignment
- BAA/DUA/SCC agreement coverage for restricted data classes and cross-border subprocessors
- approved subprocessor list and region fit
- breach-notice SLA readiness
- security-review freshness
- deterministic admin actions, webhook event envelopes, and audit digests

The module is dependency-free and uses synthetic data only. It does not contact live vendors, legal systems, webhooks, payment systems, institutional dashboards, or external APIs.

## Commands

```bash
npm run check
npm test
npm run demo
```

`npm run demo` writes reviewer artifacts to `reports/`:

- `vendor-dpa-review-packet.json`
- `vendor-dpa-review-report.md`
- `summary.svg`
- `demo.mp4`
