# Institutional Access Recertification

This module adds a focused User & Project Management slice for recertifying institutional and external collaborator access to sensitive scientific project spaces.

## What it checks

- Approved institutional domains and named external sponsors
- Current SAML assertions for elevated roles
- MFA requirements for owner, admin, editor, and data-steward access
- Verified ORCID linkage for researcher identity
- Required training and IRB approval expiry
- Project access review windows
- Stale pending invitations
- Object-level grants that exceed the member's role policy
- Deterministic audit digest for review records

## Run locally

```bash
npm run check
npm test
npm run demo
```

The sample data intentionally includes an external collaborator with expired institutional evidence, missing compliance approvals, and an object grant that exceeds the project policy.
