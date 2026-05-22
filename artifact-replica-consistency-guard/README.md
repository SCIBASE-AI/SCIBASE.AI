# Artifact Replica Consistency Guard

Self-contained reviewer module for issue #14, Scientific/Engineering Data & Code Hosting.

The guard validates hosted artifact replicas before persistent links, previews, export bundles, or reproduce buttons are enabled. It focuses on storage-mirror consistency for datasets, notebooks, model weights, and other scientific artifacts.

## What It Does

- Compares replica checksums against the canonical artifact manifest.
- Verifies manifest version alignment across primary storage, archive copies, institutional mirrors, and public landing pages.
- Detects access-policy mismatches that could expose controlled data or hide open artifacts.
- Flags stale mirror verification and routes safe preview-only cases to repair review.
- Checks DataCite DOI and schema.org landing-page consistency before export/publication.
- Generates deterministic JSON, Markdown, SVG, and MP4 artifacts from synthetic fixtures only.

## Files

- `index.js` - dependency-free replica evaluator and Markdown packet builder.
- `sample-data.js` - synthetic artifacts for held, repair-review, and publish decisions.
- `test.js` - Node tests for blocking, review-only, and publication-ready replica states.
- `demo.js` - report generator and optional MP4 artifact writer.
- `requirements-map.md` - issue requirement mapping.
- `reports/` - generated reviewer artifacts.

## Run

```bash
node --test artifact-replica-consistency-guard/test.js
FFMPEG_PATH=/path/to/ffmpeg node artifact-replica-consistency-guard/demo.js
```

No storage provider, DOI registry, external mirror, credential, private artifact, or network call is used.
