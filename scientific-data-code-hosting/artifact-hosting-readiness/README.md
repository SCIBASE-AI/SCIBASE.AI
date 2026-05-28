# Artifact Hosting Readiness

This module adds a deterministic, dependency-free readiness checker for SCIBASE issue #14. It evaluates whether scientific datasets, code, notebooks, models, metadata, access rules, and executable environments are safe to host, preview, publish, or run.

## Scope

- Supported scientific file types for data, code, notebooks, figures, videos, and models
- Artifact integrity digests, size limits, previews, and code-aware diffs
- FAIR metadata checks for persistent identifiers, license, DataCite, JSON-LD, schema.org, keywords, and variables
- Public/private access control and audit logging checks
- Runtime environment, sandbox enforcement, resource limits, and reproducibility trigger checks
- Semantic artifact bundle versioning, diff manifest, and rollback checkpoint checks

All fixtures are synthetic. The module does not access private files, storage backends, execution sandboxes, credentials, or external APIs.

## Run

```bash
node scientific-data-code-hosting/artifact-hosting-readiness/test.js
node scientific-data-code-hosting/artifact-hosting-readiness/demo.js
node scientific-data-code-hosting/artifact-hosting-readiness/make-demo-video.js
```

Generated artifact hosting reports are written to `reports/`.
