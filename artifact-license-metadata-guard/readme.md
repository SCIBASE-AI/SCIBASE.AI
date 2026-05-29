# Artifact License Metadata Guard

This module adds a focused FAIR readiness guard for Scientific/Engineering Data & Code Hosting. It checks whether hosted datasets, code, models, and supplements can be included in a public research artifact release.

It is intentionally separate from broad storage engines, drag-and-drop uploads, file previews, executable environments, dataset diffing, DOI minting, and runtime sandboxing. This guard only covers license, metadata, identifier, checksum, and sensitive-use release readiness.

## What It Checks

- Public-release compatible licenses
- DataCite/schema.org-style required metadata fields
- Persistent identifiers such as DOI or SWH IDs
- Checksum coverage
- Sensitive-use flags and access control mismatches
- Deterministic release or hold actions

## Demo

Run:

```bash
node artifact-license-metadata-guard/test.js
node artifact-license-metadata-guard/demo.js
node artifact-license-metadata-guard/render-video.js
```

Generated artifacts:

- `reports/artifact-license-metadata-report.json`
- `reports/artifact-license-metadata-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call external DOI providers, storage systems, identity providers, private repositories, credentials, or SCIBASE production services.
