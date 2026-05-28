# Repository Integrity Auditor

This module adds a deterministic, dependency-free repository/version-control auditor for SCIBASE issue #10. It checks whether a scientific project repository is ready for a version tag, citation, DOI/export bundle, or publication workflow.

## Scope

- Required project areas: manuscript, data, code, notebooks, results, protocols, and metadata
- Content hash verification for tracked artifacts
- Git LFS policy for large datasets and generated artifacts
- DOI, schema.org, author, and ORCID metadata checks
- Semantic release tag and base/head commit verification
- Fork attribution and merge request review readiness
- Reproducibility pipeline and pinned runtime checks

All fixtures are synthetic. The module does not access private project data, Git remotes, DOI providers, credentials, or external APIs.

## Run

```bash
node project-repository-version-control/repository-integrity-auditor/test.js
node project-repository-version-control/repository-integrity-auditor/demo.js
node project-repository-version-control/repository-integrity-auditor/make-demo-video.js
```

Generated repository audit artifacts are written to `reports/`.
