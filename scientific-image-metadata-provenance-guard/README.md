# Scientific Image Metadata Provenance Guard

This module adds a dependency-free provenance guard for scientific image
records before they are published into the Scientific Knowledge Graph. It is
focused on image nodes and safe graph edges, not duplicate-panel detection or
manuscript image-integrity review.

## What It Checks

- Source artifact, dataset, and protocol linkage for each image node.
- SHA-256 checksum format before KG publication.
- Acquisition date versus publication date chronology.
- Channel and pixel-size metadata for microscopy and fluorescence images.
- License and access state before public graph release.
- Private identifier leakage in filenames, metadata, and privacy tags.
- Derived figure provenance back to source images or datasets.

## Outputs

The guard emits:

- A JSON report with per-record `publish`, `review`, or `block` decisions.
- Safe graph edges suitable for KG ingestion or reviewer inspection.
- Redaction actions for private or high-risk fields.
- A Markdown reviewer summary.
- A compact SVG decision chart for PR review and demos.

## Run

```bash
python3 scientific-image-metadata-provenance-guard/image_metadata_provenance_guard.py \
  --sample \
  --json scientific-image-metadata-provenance-guard/demo/report.json \
  --markdown scientific-image-metadata-provenance-guard/demo/summary.md \
  --svg scientific-image-metadata-provenance-guard/demo/graph.svg
```

## Test

```bash
python3 -m unittest scientific-image-metadata-provenance-guard/test_image_metadata_provenance_guard.py
```
