# Analytics License Seat Roster Guard

Self-contained Revenue Infrastructure slice for `SCIBASE-AI/SCIBASE.AI#20`.

The guard reconciles named analytics dashboard and API seats before renewal or
true-up billing. It checks contracted seat classes, allowed domains, temporary
access windows, inactive paid seats, API usage by non-API seats, duplicate
identities, and finance approvals so revenue leakage can be fixed before
renewal invoices are sent.

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

## Outputs

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.webm`

All data is synthetic. The module does not call payment processors, SSO, SCIM,
ERP, analytics APIs, billing systems, or external services.
