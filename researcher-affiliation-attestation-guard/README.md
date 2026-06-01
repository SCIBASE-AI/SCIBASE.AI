# Researcher Affiliation Attestation Guard

Self-contained SCIBASE User & Project Management slice for issue #11. The guard checks whether public researcher profile affiliation and grant claims are sufficiently evidenced before they influence project trust, invitations, grants, or reputation signals.

## Why this slice is distinct

Existing #11 submissions cover RBAC/workspace ledgers, privacy access review, member lifecycle/offboarding, institutional recertification, anonymous-review escrow, data-room consent, researcher profile sync, archive handoff, access-audit anomaly, role delegation, invitation-domain/MFA, funding attribution, service-token governance, deletion/erasure, break-glass access, visibility transition, provisioning baseline, object-permission inheritance, session step-up, collaborator COI, data residency, authoring artifact integrity, ORCID publication disambiguation, and access denial appeals. This module focuses only on public profile affiliation and grant attestation: ORCID/SSO/admin evidence, expired appointments, institutional email-domain matching, grant consent, evidence receipts, and blocking unverified profile claims from trust/reputation decisions.

## Run

```bash
npm test
npm run demo
npm run demo:video
```

Demo artifacts are written to `reports/`, including JSON, Markdown, SVG, GIF, and MP4 files.
