# SCIBASE Scientific Repository Integrity Ledger

This module is a self-contained milestone for project repositories and version control in SCIBASE.AI. It models the core scientific repository contract: structured components, content-addressed files, commits, semantic version tags, forks, merge-review state, reproducibility checks, citation metadata, and export bundles.

## What it covers

- Repository manifests for manuscript, data, code, notebooks, results, protocols, and metadata.
- SHA-256 content index for reproducible content tracking.
- Commit objects with touched paths, parent linkage, author attribution, and file hashes.
- Semantic tags with DOI-style snapshot identifiers and generated citations.
- Fork provenance records that preserve upstream attribution.
- Merge request state with review threads, data-change approval requirements, and reproducibility gates.
- Export bundle metadata for ZIP, JSON manifest, and BibTeX-style citation surfaces.

## Run locally

```bash
npm test
npm run demo
node src/api.js manifest
node src/api.js export
```

The module has no external service calls and needs no credentials.
