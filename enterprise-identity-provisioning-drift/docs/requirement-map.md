# Requirement Map

Issue: SCIBASE-AI/SCIBASE.AI#19, Enterprise Tooling

## Admin Dashboards

- `evaluateProvisioningDrift()` returns summary counts for total findings, critical findings, access-review subjects, and project actions.
- `demo.js` prints reviewer-ready dashboard data for research-office operators.
- The access review queue is sorted by severity so institutional admins can triage urgent deprovisioning risk first.

## API And Webhooks

- `buildWebhookEvents()` produces signed webhook envelopes for `identity.drift.detected` and `access.review.required`.
- Signatures use deterministic HMAC-SHA256 over stable JSON bodies so receiving systems can verify integrity.
- The synthetic data includes SCIM, SAML, HRIS, and ORCID fields without requiring live credentials.

## HRIS And ORCID Personnel Sync

- Disabled HRIS users with active SCIBASE accounts are flagged as critical.
- Missing HRIS, SAML, SCIM, and ORCID mappings are surfaced with concrete remediation actions.
- Stale ORCID employment evidence is flagged for refresh.

## Compliance Tracking

- Project-level actions connect identity drift to concrete research projects and funder tags.
- Terminated users with project access are marked `revoke_now`.
- Overdue institutional access reviews are marked for recertification.

## Export Pipelines

- `auditDigest` gives reviewers and external governance systems a deterministic packet hash.
- The report is pure JSON and can be emitted into downstream exports or compliance evidence packets.

## Scope Boundary

This is not another broad admin dashboard, export pipeline, compliance evidence packet, or webhook replay ledger. It focuses on institutional identity provisioning drift before stale people data contaminates those enterprise workflows.
