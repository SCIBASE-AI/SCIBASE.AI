# Artifact Preview Cache Guard

This module covers a metadata-aware preview and versioning slice of SCIBASE issue #14.

It evaluates hosted scientific artifacts after uploads or version changes and decides whether previews can be reused, must be regenerated, or should be held because they could expose sensitive fields. The guard keeps spreadsheet previews, notebook previews, thumbnails, and metadata cards aligned with artifact hashes, upload versions, schema versions, and FAIR metadata.

## What It Does

- Classifies datasets, code, images, media, models, and supplementary artifacts.
- Detects stale previews when content hashes, upload versions, schema versions, or metadata digests drift.
- Blocks previews that expose sensitive fields such as participant IDs, emails, geolocation, or patient data.
- Produces dataset column diff summaries for upload version changes.
- Emits preview regeneration plans, FAIR metadata warnings, and a deterministic audit digest.

## Run

```bash
node artifact-preview-cache-guard/test.js
node artifact-preview-cache-guard/demo.js
```
