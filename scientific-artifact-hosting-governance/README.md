# Scientific Artifact Hosting Governance

This module adds a dependency-free governance layer for the Scientific Data & Code Hosting bounty in issue #14. It focuses on the reviewable data/code package contracts that make scientific artifacts findable, reusable, versioned, and executable.

## What It Covers

- Deterministic artifact manifests with SHA-256 content hashes.
- File-type detection for datasets, notebooks, code, figures, documents, and supplements.
- Metadata completeness checks for title, creators, description, keywords, and license.
- Metadata-aware preview descriptors for tables, notebooks, images, and source files.
- Version diff records for changed content, license changes, and metadata changes.
- JSON-LD and DataCite export payloads for FAIR discovery and DOI workflows.
- Execution environment readiness checks for reproducible analysis commands.
- Audit hash for review and long-term traceability.
- Fail-closed integrity checks for duplicate artifact identities, ambiguous version history, malformed access states, and invalid publication years.

## Run The Demo

```bash
node scientific-artifact-hosting-governance/demo.js
```

The demo prints a reviewer-ready JSON record with the artifact manifest, version diffs, runtime readiness, FAIR score, JSON-LD export, DataCite export, blockers, and audit hash.

## Visual Demo

Open `scientific-artifact-hosting-governance/docs/demo.svg` for a privacy-safe walkthrough of the module flow. It uses synthetic sample data only.

For bounty review, the same walkthrough is also available as a short WebM demo video at `scientific-artifact-hosting-governance/docs/demo.webm`.

## Run The Tests

```bash
node scientific-artifact-hosting-governance/test.js
```

The tests cover type detection, manifest previews and hashes, metadata blockers, identity collisions, malformed release metadata, ambiguous version history, runtime readiness, JSON-LD/DataCite exports, and audit hashing.

## Requirement Mapping

| Issue #14 requirement | Implementation |
| --- | --- |
| Scalable storage engine | `buildArtifactManifest()` records artifact type, hash, size, version, access, and preview metadata. |
| Metadata-aware previews | `buildPreviewDescriptor()` emits table, notebook, image, source, or download preview contracts. |
| Upload versioning and diffing | `diffArtifactVersions()` and `buildVersionDiffs()` capture content, license, and metadata changes. |
| JSON-LD/schema.org metadata | `buildJsonLd()` emits schema.org-compatible dataset distribution metadata. |
| DataCite metadata | `buildDataCite()` emits DOI-oriented identifier, creator, title, publisher, and related artifact records. |
| FAIR compliance | `scoreFairReadiness()` checks metadata completeness, public access, and runtime readiness. |
| Release integrity | `validateHostingIntegrity()` blocks ambiguous identifiers, malformed access states, invalid publication years, and duplicate version-history identities. |
| Executable environments | `validateRuntimeEnvironment()` verifies Docker/environment definition and reproducibility commands. |

## Design Notes

The module uses only Node.js built-ins and synthetic sample data. It does not require package installation, credentials, live files, or external APIs.
