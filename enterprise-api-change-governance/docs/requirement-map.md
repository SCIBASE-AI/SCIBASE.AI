# Requirement Map

## Admin Dashboards

- `buildApiChangeGovernance()` emits `dashboard.totalChanges`, `dashboard.byState`, blocked-change counts, critical integration impacts, consumer blocks, and highest risk score.
- Each reviewed change includes a state, risk score, findings, and admin actions suitable for institutional admin queues.

## API & Webhooks

- REST API changes are gated by route lists, current/proposed versions, OpenAPI-style diff evidence, deprecation windows, rollback plans, and parallel run windows.
- Webhook changes are evaluated for event envelope consistency, schema version fields, idempotency keys, and signature-version evidence.
- `webhookEvents` emits signed CloudEvents-style governance events for downstream enterprise systems.

## Export Pipelines

- `exportManifest` groups ready vs. review-required changes and includes evidence digests for compliance export packets.
- Restricted research data changes are blocked when affected integrations do not have DPA evidence.

## Enterprise Governance

- Critical consumers require acknowledged notices before release.
- Sandbox fixture evidence is tracked for each affected institutional integration.
- Migration plans include notice audience, fixture packs, rollback windows, parallel run windows, and release sequencing.

## Demo And Tests

- `data/sample-change-plan.json` includes additive, breaking, and restricted-data rollout examples.
- `test/api-change-governance.test.js` covers ready, blocked, restricted-data hold, deterministic digest, signed events, and redaction behavior.
- `scripts/demo.js` prints a terminal summary and writes demo artifacts.
