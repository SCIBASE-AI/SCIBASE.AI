# Requirements Map

Issue #19 asks for enterprise tooling around admin visibility, APIs/webhooks, export pipelines, and compliance tracking.

## Admin Dashboards

- `summary` gives approved, needs-approval, and hold counts.
- `adminQueue` routes requests to enablement, department approval, privacy/security review, vendor contract review, or platform admin review.
- `exportEvidence` gives dashboard-ready detail for each model request.

## API & Webhooks

- `buildWebhookEvent()` produces deterministic event payloads for each evaluated request.
- Event signatures are stable and can be used by integration tests or downstream systems.

## Compliance Tracking

- High-risk data classes require matching approval types.
- External models are blocked from restricted data if retention or DPA posture is unsafe.
- Blocked integrations and token budget review are enforced before enablement.

## Export / Audit Evidence

- `demo-output/governance-packet.json` is an exportable review packet.
- `auditDigest` is deterministic for before/after comparison.

## Verification

- `test.js` covers approved requests, external restricted-data holds, budget/integration holds, missing approval routing, webhook payloads, and digest format.
