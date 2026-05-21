# Enterprise SCIM Deprovisioning Guard Report

Generated identities: 4
Clear: 1
Needs review: 1
Needs revocation: 2
Admin actions: 12
Active tokens at risk: 3
Audit digest: `7f833ceb0c632024edc5186016ec5b327b5a6e3c5a735ef15f806390f04746e1`

## Identity Decisions

### USR-OK-001: active.researcher@example.edu
- Status: clear
- HRIS status: active
- SCIM active: true
- Protected roles: none
- Findings: none
- First action: Identity is aligned with HRIS and SCIM state.

### USR-REVOKE-002: departed.admin@example.edu
- Status: revoke
- HRIS status: terminated
- SCIM active: false
- Protected roles: org-admin, export-admin
- Findings: PROTECTED_ROLE_NOT_REVOKED, ACTIVE_API_TOKEN_AFTER_TERMINATION, EXPORT_CONNECTOR_OWNER_REVIEW, COMPUTE_QUOTA_REASSIGNMENT_NEEDED, PUBLICATION_OWNER_TRANSFER_NEEDED
- First action: Remove protected enterprise roles or transfer them to an approved owner.

### USR-REVIEW-003: visiting.scholar@example.edu
- Status: revoke
- HRIS status: contract-ended
- SCIM active: true
- Protected roles: publication-owner
- Findings: SCIM_ACCOUNT_STILL_ACTIVE, PROTECTED_ROLE_NOT_REVOKED, PUBLICATION_OWNER_TRANSFER_NEEDED
- First action: Disable the SCIM account and sync downstream roles.

### USR-RECLAIM-004: transferred.pi@example.edu
- Status: review
- HRIS status: department-transfer
- SCIM active: true
- Protected roles: billing-admin
- Findings: EXPORT_CONNECTOR_OWNER_REVIEW, COMPUTE_QUOTA_REASSIGNMENT_NEEDED, TRANSFER_PROTECTED_ROLE_REVIEW
- First action: Assign export connector ownership to an active accountable owner.
