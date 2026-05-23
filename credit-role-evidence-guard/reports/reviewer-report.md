# Credit Role Evidence Consistency Report

Generated: 2026-05-22T12:00:00.000Z

## Summary

- Approved: 1
- Held for steward review: 4
- Rejected before publication: 2
- Findings: 7
- Aggregate risk score: 31

## Decisions

### claim-001: HOLD

- Contributor: Mei Lin (user-mei)
- Project: proj-neuro-open-001
- Role: Data curation
- Risk score: 3
- duplicate-credit-claim: Another claim uses the same contributor, role, project, and evidence set. Remediation: Deduplicate before computing profile reputation deltas.

### claim-002: APPROVE

- Contributor: Nora Hart (user-nora)
- Project: proj-climate-model-014
- Role: Software
- Risk score: 0
- Findings: none

### claim-003: REJECT

- Contributor: Ada Pike (user-ada)
- Project: proj-neuro-open-001
- Role: Peer review
- Risk score: 11
- author-review-credit-conflict: A project author cannot receive peer-review reputation credit for reviewing their own project. Remediation: Route the review to an independent reviewer or record it as author response work.
- blind-review-identity-leak: Public profile credit is backed by blind-review evidence that could expose reviewer identity. Remediation: Publish an anonymized receipt or keep the credit private until the review mode permits disclosure.

### claim-004: HOLD

- Contributor: Ravi Singh (user-ravi)
- Project: proj-climate-model-014
- Role: Software
- Risk score: 3
- role-evidence-mismatch: Role "Software" expects code, test, notebook evidence, but got manuscript. Remediation: Attach role-appropriate evidence or change the claimed role.

### claim-005: HOLD

- Contributor: Lena Rowe (user-lena)
- Project: proj-climate-model-014
- Role: Writing - original draft
- Risk score: 3
- missing-profile-consent: Lena Rowe has not consented to publish this credit in institutional-export. Remediation: Collect contributor consent or keep the credit internal.

### claim-006: HOLD

- Contributor: Mei Lin (user-mei)
- Project: proj-neuro-open-001
- Role: Data curation
- Risk score: 3
- duplicate-credit-claim: Another claim uses the same contributor, role, project, and evidence set. Remediation: Deduplicate before computing profile reputation deltas.

### claim-007: REJECT

- Contributor: Otto Gray (user-otto)
- Project: proj-neuro-open-001
- Role: Validation
- Risk score: 8
- empty-evidence-set: No artifact evidence is attached to the contribution claim. Remediation: Attach at least one artifact matching the claimed role.
