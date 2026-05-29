# Revenue Dunning Entitlement Hold Guard

This module adds a focused failed-payment control for SCIBASE Revenue Infrastructure. It decides when renewal invoices and AI-compute top-ups should continue grace, route to finance exception handling, or hold risky entitlements after payment failures.

It is intentionally separate from broad billing ledgers, usage metering, receipt privacy, grant cost-share controls, sanctions/export checks, quote approval, seat rosters, payment authorization, customer consolidation, and revenue recognition.

## What It Checks

- Failed payment retry windows
- Dunning notice cadence
- Entitlement grace periods
- Institutional invoice exceptions
- AI compute-credit hold safety
- Analytics-license export holds

## Demo

Run:

```bash
node revenue-dunning-entitlement-hold-guard/test.js
node revenue-dunning-entitlement-hold-guard/demo.js
node revenue-dunning-entitlement-hold-guard/render-video.js
```

Generated artifacts:

- `reports/dunning-entitlement-report.json`
- `reports/dunning-entitlement-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call payment providers, banks, wallets, billing systems, ERP systems, private accounts, credentials, or SCIBASE production services.
