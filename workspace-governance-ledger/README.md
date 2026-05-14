# SCIBASE Workspace Governance Ledger

This module is a self-contained user and project management milestone for SCIBASE.AI. It models linked identities, researcher profiles, project spaces, role-based access, object-level permissions, external invitations, audit trails, and reputation metrics without external credentials or services.

## What it covers

- Linked OAuth/ORCID/SAML-style identities and MFA metadata.
- Researcher profile payloads with institution, fields, public/private visibility, and reputation metrics.
- Scientific project spaces containing documents, datasets, code assets, discussions, metadata, and collaborators.
- Role-based access checks for owner, admin, contributor, reviewer, and viewer roles.
- Object-level restrictions for sensitive project resources.
- Invitation payloads for external collaborators.
- Ordered audit trail events for governance and compliance review.

## Run locally

```bash
npm test
npm run demo
node src/api.js summary
node src/api.js access
```

The implementation is deterministic and credential-free so reviewers can run it locally.
