# Service Account Governance Review Packet

Project: `proj-neuro-crispr-042`
Evaluated at: `2026-05-22T02:45:00.000Z`
Packet digest: `666b87b6c50a31f45c48ef9e66f9ad3ba66f49d67f6bf5daf74a9bb0394d5d6f`

## Summary

- Accounts evaluated: 4
- Issue or retain: 1
- Hold for owner review: 2
- Deny or revoke: 1
- Critical findings: 1
- Protected scopes blocked: 5

## Decisions

### Notebook rerun worker

- Account: `svc-notebook-rerun`
- Decision: `issue_or_retain`
- Severity: `low`
- Risk score: 24
- Rejected scopes: none
- Blockers: none
- Audit digest: `e383d144e13c5780b64b47fdaa051267ce0ca7530d5b06db8b4fa1f7dfc61670`

### ORCID profile sync token

- Account: `tok-orcid-profile-sync`
- Decision: `hold_for_owner_review`
- Severity: `low`
- Risk score: 27
- Rejected scopes: none
- Blockers: `token_lifetime_too_long`
- Audit digest: `9cf2e02e8bc5f7da82b43c0c5fe7e11d4a9ef280939e7cb7de099bd376807334`

### External vendor export bridge

- Account: `tok-vendor-export`
- Decision: `deny_or_revoke`
- Severity: `critical`
- Risk score: 369
- Rejected scopes: `*`, `restricted-data:download`, `dataset:delete`, `project:admin`
- Blockers: `owner_sponsor_missing`, `requester_mfa_missing`, `integration_unverified`, `token_expiry_missing`, `rotation_stale`, `wildcard_scope`, `missing_use_case:dataset-human-rnaseq`, `sensitive_protected_grant:dataset-human-rnaseq`, `approval_event_missing:owner_approved`, `approval_event_missing:issued`
- Audit digest: `f8cf021653f7d21a0fba185fffedb5e65b6912e46da1924ca08aaa342c6ec3e1`

### Manuscript release assistant

- Account: `svc-manuscript-release`
- Decision: `hold_for_owner_review`
- Severity: `high`
- Risk score: 94
- Rejected scopes: `manuscript:publish`
- Blockers: `approval_event_missing:issued`
- Audit digest: `8bb48aa2be8d66c0d1af19c293559f0c45bbd8a14ba13a007afd3ccc96725582`

## Owner Queue

- `low` `tok-orcid-profile-sync` owner_review_required: ORCID profile sync token needs owner review before issuance or retention.
- `critical` `tok-vendor-export` revoke_or_deny_token: External vendor export bridge cannot be safely issued or retained until blockers are resolved.
- `high` `svc-manuscript-release` owner_review_required: Manuscript release assistant needs owner review before issuance or retention.
