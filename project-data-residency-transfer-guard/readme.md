# Project Data Residency Transfer Guard

This is a focused User & Project Management slice for SCIBASE project spaces. It evaluates project access and sharing changes before data crosses institutional, jurisdictional, or residency boundaries.

The guard uses synthetic reviewer scenarios only. It does not call identity providers, OAuth, SAML, ORCID, production access-control systems, external APIs, payment systems, live projects, credentials, tokens, or private user data.

## What It Checks

- Project visibility and home institution region.
- Requested destination region and external collaborator institution.
- Dataset/object classification, including restricted human genomic and clinical-derived data.
- DPA, DUA, IRB, export embargo, and data-steward approval evidence.
- Deterministic audit digests for reviewer handoff.

## Run

```bash
node project-data-residency-transfer-guard/test.js
node project-data-residency-transfer-guard/demo.js
node project-data-residency-transfer-guard/render-video.js
```

Generated reviewer artifacts are written to `project-data-residency-transfer-guard/reports/`.

## Scope Boundary

This slice is distinct from existing #11 work around RBAC/workspace ledgers, privacy review, member lifecycle/offboarding, institutional recertification, anonymous review, identity merge/export, data-room consent, profile sync, archive handoff, access-audit anomaly, role delegation, invitation/MFA, funding attribution, service-token governance, deletion/erasure, break-glass, visibility transition, provisioning baseline, object-permission inheritance, reputation anomaly, session step-up, and collaborator conflict-of-interest guards.
