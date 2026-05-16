# Enterprise Identity Provisioning Drift

This module adds a focused enterprise tooling slice for institutional identity operations. It models SCIM, SAML, HRIS, and ORCID personnel sync health so research offices can catch stale access before it leaks into projects, dashboards, exports, or webhook integrations.

It is intentionally self-contained, dependency-free, and synthetic-data-only. It does not call live identity providers or require credentials.

## What It Covers

- HRIS employees who are disabled but still have active SCIBASE access.
- SCIBASE users missing HRIS records, SAML subjects, SCIM external IDs, or ORCID linkage.
- Department and lab mapping drift between HRIS and platform profiles.
- Project access that needs recertification or immediate revocation.
- Signed webhook event envelopes for IAM, SIEM, and governance systems.
- Reviewer-ready access review packets with deterministic audit digests.

## Run Locally

```bash
cd enterprise-identity-provisioning-drift
npm run check
npm test
npm run demo
```

## Demo Output

The demo prints a synthetic institutional sync report:

- identity drift count
- critical deprovisioning actions
- access review queue
- webhook delivery subjects
- deterministic audit digest

The visual demo artifact is in `docs/demo.svg`. A short MP4 terminal-style demo is in `docs/demo.mp4` when generated for the PR.

## Issue Mapping

This contributes to SCIBASE-AI/SCIBASE.AI#19 by covering the enterprise tooling requirement for API integrations with HRIS and ORCID personnel data, organization-level governance, admin oversight, compliance tracking, and webhook-ready institutional events.
