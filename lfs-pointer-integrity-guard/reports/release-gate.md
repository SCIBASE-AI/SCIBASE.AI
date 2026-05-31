# Git LFS Pointer Integrity Guard

Repository: SCIBASE.AI reproducibility-demo
Release: preprint-v2.1
Decision: block-release

## Summary

- LFS files checked: 7
- Blockers: 4
- Holds: 4
- Passed: 1
- Projected LFS usage: 268 MB of 260 MB

## Findings

- BLOCKER lfs-checksum-mismatch (models/cell-segmentation.bin): Stored large-object checksum does not match the pointer object id.
- BLOCKER lfs-size-mismatch (results/calibration-video.mov): Stored large-object byte size does not match the pointer size.
- BLOCKER lfs-object-missing (results/microscopy-stack.tif): Pointer references an object that is absent from large-object storage.
- BLOCKER pointer-malformed (results/highres-figure.tiff): Git LFS pointer is malformed: oid-invalid-sha256, size-invalid
- HOLD lfs-retention-too-short (data/supplementary-sensors.parquet): Large-object retention expires before the repository citation retention window.
- HOLD release-manifest-missing (data/supplementary-sensors.parquet): Git LFS file is not represented in the tagged release/export manifest.
- HOLD doi-export-coverage-missing (data/private-cohort-dictionary.xlsx): Large object is omitted from the DOI/export bundle coverage map.
- HOLD lfs-quota-risk (preprint-v2.1): Tagged release would exceed the configured Git LFS storage quota after pending uploads.

## Remediation

- Regenerate malformed pointer files with git-lfs pointer canonical output before tagging.
- Upload or restore missing large objects, then re-run pointer verification from a clean clone.
- Quarantine mismatched large objects and republish from verified source artifacts.
- Add every Git LFS artifact to the DOI/export coverage map or document an explicit exclusion.
- Move release artifacts to a retention tier that satisfies the citation retention window.
- Resolve pending large uploads, archive superseded objects, or raise quota before release.

## File Results

- PASS data/trial-baseline.csv (storage present, manifest covered)
- BLOCK models/cell-segmentation.bin (storage present, manifest covered)
- BLOCK results/calibration-video.mov (storage present, manifest covered)
- BLOCK results/microscopy-stack.tif (storage missing, manifest covered)
- BLOCK results/highres-figure.tiff (storage missing, manifest gap)
- HOLD data/supplementary-sensors.parquet (storage present, manifest gap)
- HOLD data/private-cohort-dictionary.xlsx (storage present, manifest covered)
