# Reproducibility Dependency Guard

## Overview
This module ensures that all analytical pipelines and dependencies referenced in a SCIBASE project are explicitly version-pinned. It mitigates the risk of 'silent failures' where a pipeline executes perfectly today but fails tomorrow due to upstream dependency drift.

## Validation Rules
1. **No Floating Versions**: `^`, `~`, or `latest` tags are strictly forbidden.
2. **SHA-256 Checksums**: External binary dependencies must include cryptographic hashes.
3. **Data Immutability**: URLs pointing to datasets must resolve to archival domains (e.g., Zenodo, Figshare) rather than volatile web endpoints.

## Security & Safety
The module relies solely on static analysis of `submission.json` manifests. It makes zero network calls, requires zero external node modules, and operates safely in air-gapped CI/CD environments.
