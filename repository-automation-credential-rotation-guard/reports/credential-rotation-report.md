# Repository Automation Credential Rotation Report

Generated: 2026-06-01T00:00:00.000Z
Audit digest: `sha256:df7bbee385a7836cf431384cfd664374a9e09afacf949bf670873ba1c192caca`

## Summary

- Projects reviewed: 3
- Credentials reviewed: 6
- Critical findings: 3
- High findings: 7
- Medium findings: 4

## Project Decisions

### oncology-signature-atlas

- Repository: `scibase/oncology-signature-atlas`
- Release candidate: `v2.1.0`
- Decision: **release-ready**
- Findings: 0 critical, 0 high, 0 medium

| Credential | Decision | Critical | High | Medium | Key Finding |
| --- | --- | ---: | ---: | ---: | --- |
| gha-release-oidc | release | 0 | 0 | 0 | No blockers found. |
| container-registry-publisher | release | 0 | 0 | 0 | No blockers found. |

### climate-reanalysis-ledger

- Repository: `scibase/climate-reanalysis-ledger`
- Release candidate: `v0.9.4`
- Decision: **hold-release**
- Findings: 3 critical, 6 high, 4 medium

| Credential | Decision | Critical | High | Medium | Key Finding |
| --- | --- | ---: | ---: | ---: | --- |
| legacy-publish-key | hold | 2 | 4 | 4 | legacy-publish-key is 227 days from last rotation; limit is 120 days. |
| workflow-admin-pat | hold | 1 | 2 | 0 | workflow-admin-pat is 77 days from last rotation; limit is 45 days. |

### single-cell-lineage-browser

- Repository: `scibase/single-cell-lineage-browser`
- Release candidate: `v1.4.0`
- Decision: **rotate-before-release**
- Findings: 0 critical, 1 high, 0 medium

| Credential | Decision | Critical | High | Medium | Key Finding |
| --- | --- | ---: | ---: | ---: | --- |
| dataset-mirror-reader | release | 0 | 0 | 0 | No blockers found. |
| artifact-signer | rotate | 0 | 1 | 0 | artifact-signer has 7 days of validity after the release window starts. |

