# Dataset Schema Evolution Gate

This module adds a focused Scientific/Engineering Data & Code Hosting guard for dataset schema evolution. It evaluates whether a newly uploaded dataset version remains safe for previews, API consumers, and executable reruns before the platform exposes the version as reusable research infrastructure.

It is intentionally self-contained and dependency-free so reviewers can run it quickly.

## What It Checks

- Removed, renamed, added, and reordered fields across dataset versions.
- Breaking type, unit, identifier, nullability, and semantic-role drift.
- Whether existing preview lanes, API consumers, and rerun jobs can still use the new version.
- DataCite and schema.org variable metadata updates for discoverability.
- Reviewer actions for migration notes, compatibility holds, and rerun validation.

## Usage

```bash
node dataset-schema-evolution-gate/test.js
node dataset-schema-evolution-gate/demo.js
```

The demo writes reviewer artifacts to `dataset-schema-evolution-gate/reports/`:

- `schema-evolution-audit.json`
- `reviewer-packet.md`
- `schema-evolution-summary.svg`
- `demo.mp4`

## Maintainer-Friendly Notes

- Uses synthetic dataset metadata only.
- Does not call external services.
- Does not inspect private files, credentials, payment data, or live research records.
- Keeps scope distinct from FAIR manifests, package integrity, preview cache, raw-instrument preview, notebook preview, retention/tombstone, model-card lineage, license compatibility, sensitive-redaction, environment drift, provenance-chain, quarantine/rerun, quota/dedup, and access-gate slices.
