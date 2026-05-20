# Project Service Account Governance Guard

This module adds a focused project service-account governance guard for the User & Project Management bounty in issue #11. It evaluates project-scoped bot accounts and API tokens before they are renewed, rotated, suspended, or revoked.

The scope is distinct from broad workspace RBAC, privacy access review, member lifecycle/offboarding, institutional recertification, anonymous-review escrow, identity merge/export, project data-room consent, researcher profile sync, archive handoff, access-audit anomaly, and delegation approval submissions.

## What It Checks

- Active accountable human owner and active project sponsor evidence.
- Owner MFA, SAML, and ORCID assurance posture.
- Least-privilege automation scopes and privileged-scope blockers.
- Token issue, rotation, last-use, and expiry windows.
- Orphaned automation after human owner departure.
- External integration vendor approval and data-use evidence.
- Secret exposure, revocation actions, and deterministic audit digests.

## Decisions

The evaluator returns:

- `approved`: owner, sponsor, scopes, and token lifecycle evidence are current.
- `needs_rotation`: warning-level findings require token rotation or owner review before renewal.
- `suspended`: privileged scope or external export risk blocks active use until review.
- `revoked`: orphaned or exposed tokens require immediate revocation.

## Run The Demo

From the repository root:

```bash
node project-service-account-governance-guard/test.js
node project-service-account-governance-guard/demo.js
```

The demo writes:

- `reports/service-account-governance-report.json`
- `reports/service-account-review-packet.md`
- `reports/service-account-governance.svg`

This submission also includes `reports/demo.mp4` as a short visual preview of the generated project access packet.
