# Enterprise Incident Response Governance

Self-contained milestone for SCIBASE.AI issue #19, Enterprise Tooling.

This module gives institutional admins an incident governance layer for
integration, export, access, and privacy events. It is synthetic-data-only and
has no network calls, credentials, or external service dependencies.

## What It Covers

- Incident severity scoring across privacy, integration, export, access, and
  compliance events.
- Breach-notification and escalation clocks for restricted or personal data.
- Owner routing for research offices, security teams, integration owners, and
  compliance admins.
- Export and webhook holds when incident evidence is incomplete.
- Dashboard-ready incident metrics for institutional admins.
- Signed, webhook-ready event packets and stable audit digests.

## Files

- `index.js` - incident response governance engine.
- `demo.js` - terminal demo for admin incident packets.
- `test.js` - dependency-free regression tests.
- `demo.mp4` - short demo artifact for bounty review.

## Run

```sh
node enterprise-incident-response-governance/test.js
node enterprise-incident-response-governance/demo.js
```

## Requirement Map

| Issue #19 Requirement | Implementation |
| --- | --- |
| Admin dashboards | `buildIncidentDashboard()` returns open counts, critical incidents, overdue clocks, team queues, and export holds. |
| Contributor and usage oversight | Incidents include project, department, integration, actor, affected-record, and evidence fields for admin review. |
| API and webhooks | Each packet includes a signed webhook event with deterministic digest and replay-safe incident ID. |
| Export pipelines | Export incidents can hold repository/journal/funder deliveries until evidence and owner approvals are complete. |
| Compliance tracking | Breach clocks, data classification, notification deadlines, and required evidence gates are modeled directly. |
| Enterprise operations | Routing actions assign security, research office, integration owner, and compliance workstreams. |
