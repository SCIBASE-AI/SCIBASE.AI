# Webhook Payload Redaction Guard

Issue: SCIBASE-AI/SCIBASE.AI#19
Decision: block-unsafe-webhook-delivery
Score: 0

## Event Decisions

- evt-001: block-delivery
  - Rules: webhook-top-level-field-not-allowlisted, webhook-signature-metadata-incomplete, webhook-private-project-field-present, webhook-pii-field-present, webhook-pii-field-present, webhook-private-storage-link-present, webhook-dataset-access-not-public-safe
- evt-002: deliver
- evt-003: block-delivery
  - Rules: webhook-region-not-allowed, webhook-signature-metadata-incomplete, webhook-signature-algorithm-unsafe, webhook-private-project-field-present, webhook-pii-field-present, webhook-pii-field-present

## Findings

- **medium / webhook-top-level-field-not-allowlisted**: evt-001 includes non-allowlisted top-level field debugTrace.
  - Action: Drop non-contract fields before webhook delivery.
  - Refs: evt-001, debugTrace
- **high / webhook-signature-metadata-incomplete**: evt-001 is missing signature field keyId.
  - Action: Regenerate signed event metadata before delivery.
  - Refs: evt-001, keyId
- **high / webhook-private-project-field-present**: evt-001 includes private project field project.privateNotes.
  - Action: Remove private workspace fields from outbound payloads.
  - Refs: evt-001, project.privateNotes
- **critical / webhook-pii-field-present**: evt-001 includes PII field project.owner.fullName.
  - Action: Redact direct identifiers before institutional webhook delivery.
  - Refs: evt-001, project.owner.fullName
- **critical / webhook-pii-field-present**: evt-001 includes PII field project.owner.email.
  - Action: Redact direct identifiers before institutional webhook delivery.
  - Refs: evt-001, project.owner.email
- **critical / webhook-private-storage-link-present**: evt-001 exposes a private storage URL at dataset.downloadUrl.
  - Action: Replace private URLs with DOI/metadata links or suppress the field.
  - Refs: evt-001, dataset.downloadUrl
- **critical / webhook-dataset-access-not-public-safe**: evt-001 includes dataset data-raw with access restricted.
  - Action: Suppress dataset delivery or emit metadata-only redacted payload.
  - Refs: evt-001, data-raw, restricted
- **high / webhook-region-not-allowed**: evt-003 targets region APAC.
  - Action: Hold delivery until data-residency routing is approved.
  - Refs: evt-003, APAC
- **high / webhook-signature-metadata-incomplete**: evt-003 is missing signature field digest.
  - Action: Regenerate signed event metadata before delivery.
  - Refs: evt-003, digest
- **critical / webhook-signature-algorithm-unsafe**: evt-003 uses unsafe signature algorithm none.
  - Action: Block delivery until a production signing algorithm is used.
  - Refs: evt-003, none
- **high / webhook-private-project-field-present**: evt-003 includes private project field project.internalReviewerComments.
  - Action: Remove private workspace fields from outbound payloads.
  - Refs: evt-003, project.internalReviewerComments
- **critical / webhook-pii-field-present**: evt-003 includes PII field review.reviewer.fullName.
  - Action: Redact direct identifiers before institutional webhook delivery.
  - Refs: evt-003, review.reviewer.fullName
- **critical / webhook-pii-field-present**: evt-003 includes PII field review.reviewer.employeeId.
  - Action: Redact direct identifiers before institutional webhook delivery.
  - Refs: evt-003, review.reviewer.employeeId

## Safety

- Synthetic webhook, project, dataset, review, and connector data only
- No live webhook delivery, repository sync, LMS sync, identity, storage, or external provider calls
- No private institutional payloads, credentials, secrets, real users, or live admin mutations
