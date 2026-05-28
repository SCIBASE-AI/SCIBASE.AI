# Project Deletion Escrow Auditor

This module adds a deterministic, dependency-free destructive-action escrow auditor for SCIBASE issue #11. It checks whether project archive/delete requests are safe to schedule without losing provenance, citations, collaborator access, exports, or compliance records.

## Scope

- Requester membership, owner/admin role, and fresh MFA evidence
- Reversible escrow window and rollback checkpoint checks
- Pre-delete export bundle, DOI tombstone, and indexed-project redirect readiness
- Collaborator notice coverage and notice window enforcement
- Legal hold, active review, downstream fork attribution, and unsettled compute charge checks

All fixtures are synthetic. The module does not access live projects, private files, identity providers, billing providers, credentials, or external APIs, and it never executes destructive actions.

## Run

```bash
node user-project-management/project-deletion-escrow-auditor/test.js
node user-project-management/project-deletion-escrow-auditor/demo.js
node user-project-management/project-deletion-escrow-auditor/make-demo-video.js
```

Generated deletion escrow audit artifacts are written to `reports/`.
