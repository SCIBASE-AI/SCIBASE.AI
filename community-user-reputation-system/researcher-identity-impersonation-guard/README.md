# Researcher Identity Impersonation Guard

This module adds a synthetic, dependency-free review guard for SCIBASE issue #15. It validates public researcher identity claims before endorsements, peer reviews, badges, reputation deltas, citation pages, or institutional exports trust the profile.

## Scope

- ORCID, institutional email, and external-profile verification freshness
- Duplicate external identifier claims
- Reserved-name and lookalike-handle collisions
- Affiliation-domain mismatches
- Suspicious profile handle or display-name changes near trust events
- Anonymous or double-blind review identity-safety risks

All sample data is synthetic. The module does not call live identity providers, credential systems, ORCID, institutional directories, profile services, or external APIs.

## Run

```bash
node community-user-reputation-system/researcher-identity-impersonation-guard/test.js
node community-user-reputation-system/researcher-identity-impersonation-guard/demo.js
node community-user-reputation-system/researcher-identity-impersonation-guard/make-demo-video.js
```

Generated reviewer artifacts are written to `reports/`.
