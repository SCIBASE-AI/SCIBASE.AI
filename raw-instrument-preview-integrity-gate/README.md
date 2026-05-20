# Raw Instrument Preview Integrity Gate

This module is a focused Scientific/Engineering Data & Code Hosting slice for SCIBASE issue #14. It protects previews for raw instrument outputs so researchers can inspect hosted data without accidentally exposing raw restricted values or drifting away from the original instrument metadata.

## What It Adds

- Raw instrument type classification for `.fcs`, `.mzml`, `.nd2`, and `.h5` artifacts.
- Checksum, unit, calibration, instrument metadata, license, and embargo checks before preview generation.
- Preview transform validation for deterministic lineage-preserving downsampling.
- DataCite and schema.org packets that preserve preview decisions and technical metadata.
- Reviewer queues for blocked and metadata-only previews.
- Offline JSON and SVG demo output from synthetic instrument artifacts.

## Why This Is Distinct

Existing #14 submissions cover broad FAIR manifests, access/compute-run governance, executable environment drift, provenance chains, artifact quarantine, storage quotas, FAIR access gates, and artifact package integrity. This slice focuses specifically on raw instrument output preview safety and metadata-preserving transformations.

## Run

```bash
node raw-instrument-preview-integrity-gate/test.js
node raw-instrument-preview-integrity-gate/demo.js
```

The demo writes:

- `raw-instrument-preview-integrity-gate/preview-report.json`
- `raw-instrument-preview-integrity-gate/demo.svg`

## Decision Policy

Checksum drift or high-risk transform failures block preview generation. Unit or calibration drift falls back to metadata-only previews. Stable artifacts with lineage-preserving transforms receive safe preview descriptors.
