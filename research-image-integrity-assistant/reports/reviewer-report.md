# Research Image Integrity Assistant Report

Manuscript: ms-neuron-organoid
Generated: 2026-05-22T13:00:00Z
Decision: hold-for-review
Integrity score: 65

## Packet Summary

Figures: 2
Panels: 2
Raw images: 2
Processing logs: 2
Duplicate panel groups: 1
Scale-bar mismatches: 0
Findings: 1

## Findings

- critical: duplicate-panel - Panels share perceptual hash phash:001122aa

## Required Actions

- verify_panel_uniqueness: figure-1:1A, figure-3:3C (duplicated image panels need raw-data review before peer-review release)

---
# Research Image Integrity Assistant Report

Manuscript: ms-missing-provenance
Generated: 2026-05-22T13:00:00Z
Decision: hold-for-review
Integrity score: 30

## Packet Summary

Figures: 1
Panels: 1
Raw images: 0
Processing logs: 0
Duplicate panel groups: 0
Scale-bar mismatches: 0
Findings: 2

## Findings

- critical: missing-raw-provenance - figure-2:2B lacks linked raw image provenance
- critical: missing-processing-log - figure-2:2B lacks a linked processing history

## Required Actions

- attach_raw_image_provenance: figure-2:2B (reviewers need raw-image checksum, capture time, and pixel-size metadata)
- attach_processing_log: figure-2:2B (reviewers need auditable crop, contrast, and adjustment history)

---
# Research Image Integrity Assistant Report

Manuscript: ms-scale-bar-risk
Generated: 2026-05-22T13:00:00Z
Decision: needs-author-response
Integrity score: 80

## Packet Summary

Figures: 1
Panels: 1
Raw images: 1
Processing logs: 1
Duplicate panel groups: 0
Scale-bar mismatches: 1
Findings: 1

## Findings

- major: scale-bar-mismatch - figure-4:4D declares 50 um but metadata implies 25 um

## Required Actions

- reconcile_scale_bar_metadata: figure-4:4D (declared scale bar must match raw pixel-size metadata before reviewer approval)

---
# Research Image Integrity Assistant Report

Manuscript: ms-clean-image-packet
Generated: 2026-05-22T13:00:00Z
Decision: approved
Integrity score: 100

## Packet Summary

Figures: 1
Panels: 2
Raw images: 2
Processing logs: 2
Duplicate panel groups: 0
Scale-bar mismatches: 0
Findings: 0

## Findings

- None

## Required Actions

- None
