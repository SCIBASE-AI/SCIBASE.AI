# Enterprise API Change Governance

This module adds a focused Enterprise Tooling slice for institutional REST API and webhook contract governance. It helps university, institute, and corporate R&D admins decide whether an integration-facing change is ready to ship, needs review, should be held, or must be blocked before it breaks downstream systems.

## What It Covers

- Versioned REST route and webhook event change review.
- Breaking-change detection for removed fields, type changes, new required fields, and short deprecation windows.
- Critical consumer readiness checks for notice acknowledgement, sandbox evidence, migration tickets, and version negotiation.
- Restricted research data gates that require DPA evidence before funder or repository integrations receive sensitive payloads.
- Admin dashboard metrics, prioritized remediation actions, migration plans, export evidence manifests, and signed webhook review events.

## Why This Is Distinct

Existing Enterprise Tooling submissions cover broad dashboards, export packages, compliance evidence packets, audit routing, webhook replay, identity drift, retention/legal hold, data residency, SLA, secret rotation, lab inventory, and compute/storage quotas. This slice focuses specifically on contract-change governance before APIs and webhook schemas are released to enterprise consumers.

## References Reviewed

- OpenAPI-style machine-readable contract diffs for REST API route review.
- CloudEvents-style event envelopes for routing, replay, and event metadata consistency.
- Backward-compatible API evolution practices such as versioned releases, deprecation windows, and consumer migration evidence.

## Local Usage

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `docs/demo.svg`
- `docs/governance-report.json`

This PR also includes a short synthetic walkthrough video at `docs/demo.mp4`.

The committed sample data is synthetic and does not contain credentials, private research data, bank details, or personally identifying documents.
