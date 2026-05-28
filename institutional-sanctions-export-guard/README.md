# Institutional Sanctions Export Guard

This module adds a focused Revenue Infrastructure slice for SCIBASE issue #20. It checks whether institutional and government subscriptions, AI compute bundles, and analytics API exports can be invoiced or activated before compliance clearance.

The guard holds invoices and entitlements for restricted-party matches, restricted jurisdictions, export-controlled compute or analytics packages without clearance, and unsupported payment rails. Eligible requests can proceed to invoice and revenue recognition.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/eligibility-packet.json`
- `reports/eligibility-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not use credentials, private buyers, live sanctions providers, payment rails, bank data, or external APIs.
