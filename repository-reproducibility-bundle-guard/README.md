# Repository Reproducibility Bundle Guard

Self-contained SCIBASE Project Repository & Version Control slice for issue #10. The guard checks whether a scientific repository release candidate is reproducible before a tag, DOI export, or public publication packet is treated as ready.

## Why this slice is distinct

Existing #10 submissions cover broad repository ledgers, branch protection, component-owner approval, semantic tags, external reference pinning, notebook-output diffs, fork provenance, release signatures, restore rehearsal, automation credential rotation, artifact pruning, Git LFS pointer integrity, review-decision provenance, and release-note claim evidence. This module focuses only on reproducibility bundle readiness: required manifest components, SHA-256 integrity, executable lockfile evidence, pinned runtime images, data/result provenance, release metadata, and export-bundle completeness.

## Run

```bash
npm test
npm run demo
npm run demo:video
```

Demo artifacts are written to `reports/`, including JSON, Markdown, SVG, GIF, and MP4 files.
