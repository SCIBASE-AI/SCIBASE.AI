# Requirement Map

## Repository structure and components

- `buildRepositoryManifest` validates required scientific repository components: manuscript, data, code, notebooks, results, protocols, and `metadata.json`.
- `sample-data.js` includes a complete repository with each required component represented.

## File and metadata versioning

- `buildContentIndex` generates deterministic SHA-256 hashes for every repository file.
- `createCommit` links changed paths to content hashes and parent commits.
- `createSemanticTag` creates DOI-style immutable snapshots for versions such as preprints.

## Collaboration and forking

- `buildForkRecord` preserves parent repository attribution and a provenance hash.
- `buildMergeRequest` captures changed paths, review threads, approval requirements, commit IDs, and mergeability.

## In-browser editors and diffs

- Merge request payloads expose changed paths and discussion threads that a UI can render beside Markdown, data, code, notebook, or protocol diffs.

## Computation-aware reproducibility

- `runReproducibilityChecks` gates mergeability on environment files, notebooks, and raw data evidence.

## Citation and export

- `createSemanticTag` generates citation text and snapshot DOI metadata.
- `buildExportBundle` produces bundle metadata with manifest hash, files, citation, export formats, and API path.
