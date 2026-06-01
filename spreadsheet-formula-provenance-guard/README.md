# Spreadsheet Formula Provenance Guard

Self-contained SCIBASE Scientific/Engineering Data & Code Hosting slice for issue #14. The guard checks whether uploaded spreadsheet datasets are reproducible and safe to publish before metadata-aware previews, normalized exports, or DOI-ready research packets are generated.

## Why this slice is distinct

Existing #14 submissions cover broad FAIR manifests, artifact package integrity, preview cache/version drift, raw-instrument previews, notebook previews, retention/tombstones, model-card lineage, license metadata, sensitive redaction, schema evolution, data dictionaries, persistent identifiers, SBOM/advisory checks, upload checkpoints, replica consistency, column sensitivity, malware/archive quarantine, executable sandbox egress policy, and supplementary media accessibility previews. This module focuses only on spreadsheet formula provenance: formula cells, volatile functions, stale calculated values, hidden sheets, external workbook links, macro-enabled files, normalized export checksums, and reviewer-ready transformation evidence.

## Run

```bash
npm test
npm run demo
npm run demo:video
```

Demo artifacts are written to `reports/`, including JSON, Markdown, SVG, GIF, and MP4 files.
