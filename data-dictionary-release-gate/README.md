# Data Dictionary Release Gate

Self-contained release-readiness module for SCIBASE issue #14, focused on scientific data and code hosting.

The gate evaluates whether tabular research artifacts have a release-ready data dictionary before a DOI, API export, or public archive package is published. It checks column coverage, measurement units, missingness explanations, semantic tags, schema.org/DataCite discovery metadata, checksums, license/access policy, and sensitive-variable handling.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts to `reports/`:

- `data-dictionary-release-packet.json`
- `data-dictionary-release-report.md`
- `summary.svg`
- `demo.mp4`

## Scope

This slice is intentionally narrow. It does not implement storage infrastructure, license compatibility review, sensitive file redaction, schema migration, preview rendering, retention tombstones, or execution environments. Those are covered by nearby PRs; this module focuses on dictionary and unit readiness for released datasets.
