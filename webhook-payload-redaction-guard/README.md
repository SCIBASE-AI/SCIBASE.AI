# Webhook Payload Redaction Guard

Self-contained Enterprise Tooling slice for `SCIBASE-AI/SCIBASE.AI#19`.

The guard validates outbound institutional webhook/API payloads before delivery.
It checks schema allowlists, private-project field leakage, PII and direct
identifier exposure, private storage links, data-residency routing, event
signature metadata, and dataset access safety. It emits deterministic event
decisions so unsafe payloads are blocked or redacted before institutional sync.

This is intentionally separate from webhook replay ledgers, admin notification
escalation, connector certification, API change governance, data export approval,
deposit reconciliation, SCIM/HRIS deprovisioning, LMS roster passback, usage
cost allocation, incident response, data residency policy, and secret rotation
slices. Its job is outbound payload minimization and redaction before delivery.

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

All data is synthetic. The module does not call live webhook delivery,
repository sync, LMS sync, identity, storage, or external provider systems.
