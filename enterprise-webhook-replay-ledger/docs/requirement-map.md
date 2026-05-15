# Requirement Map

Issue: SCIBASE-AI/SCIBASE.AI#19, Enterprise Tooling.

## Admin Dashboards

The ledger emits delivery health, dead-letter counts, replay-ready counts,
manual-review counts, retry state, and per-destination delivery evidence. These
values can populate an institutional admin dashboard for integration and export
reliability.

## API & Webhooks

Each event is wrapped in a deterministic envelope with a destination id,
idempotency key, signing key id, body digest, and signature preview. The sample
destinations cover institutional repositories, learning management systems,
electronic lab notebooks, and funder portals.

## Webhook Reliability

Destination policies define accepted event types, retry windows, max attempts,
replay approval requirements, and retention. Failed attempts are classified into
retryable, dead-letter, replay-approved, or manual-review states.

## Export Pipelines

Dataset export, project publication, DOI registration, review completion, and
compliance mandate events can be delivered to downstream systems. Replay plans
preserve the same idempotency key so external systems do not duplicate exports.

## Compliance And Reporting

The funder portal sample demonstrates compliance mandate reporting with a
manual-review hold when replay needs enterprise approval. Audit digests make the
delivery state reproducible for research-office reporting.

## Scope Boundary

This is not another broad enterprise dashboard, export package generator,
trust-center module, or compliance evidence packet. It is a reliability and
replay layer for enterprise webhook delivery.
