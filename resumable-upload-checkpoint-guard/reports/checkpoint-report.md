# Resumable Upload Checkpoint Guard Report

Upload: upload-climate-parquet
Artifact: datasets/climate-observations.parquet
Generated: 2026-05-22T14:10:00Z
Expires: 2026-05-23T00:00:00Z
Decision: abort-and-reupload
Integrity score: 35

## Upload Coverage

Chunks: 3/4
Coverage: 75%
Bytes: 3072/4096
Findings: 2

## Findings

- critical: missing-upload-chunk - Upload checkpoint is missing chunk indexes 2
- major: upload-size-mismatch - Received 3072 bytes but artifact manifest expects 4096

## Required Actions

- abort_incomplete_checkpoint: upload-climate-parquet (durable artifact commits require contiguous multipart coverage)
- reconcile_upload_size: upload-climate-parquet (chunk byte totals must match the artifact manifest)

---
# Resumable Upload Checkpoint Guard Report

Upload: upload-notebook
Artifact: notebooks/reproduce.ipynb
Generated: 2026-05-22T14:10:00Z
Expires: 2026-05-23T00:00:00Z
Decision: hold-resume
Integrity score: 75

## Upload Coverage

Chunks: 2/2
Coverage: 100%
Bytes: 2048/2048
Findings: 1

## Findings

- major: chunk-checksum-mismatch - Chunk 1 declares sha256:declared but observed sha256:observed

## Required Actions

- reupload_chunk: upload-notebook:chunk-1 (chunk checksum evidence must match before upload resume or artifact commit)

---
# Resumable Upload Checkpoint Guard Report

Upload: upload-rna-counts
Artifact: datasets/rna-counts.csv
Generated: 2026-05-22T14:10:00Z
Expires: 2026-05-23T00:00:00Z
Decision: hold-metadata
Integrity score: 80

## Upload Coverage

Chunks: 1/1
Coverage: 100%
Bytes: 1000/1000
Findings: 2

## Findings

- metadata: missing-final-manifest-hash - Artifact lacks final manifest hash
- metadata: missing-metadata-schema - Artifact lacks DataCite/schema.org metadata schema evidence

## Required Actions

- record_final_manifest_hash: datasets/rna-counts.csv (durable commits need a stable manifest hash for replay and DOI metadata)
- attach_metadata_schema: datasets/rna-counts.csv (hosted research artifacts need machine-readable metadata before commit)

---
# Resumable Upload Checkpoint Guard Report

Upload: upload-clean-supplement
Artifact: supplements/source-data.zip
Generated: 2026-05-22T14:10:00Z
Expires: 2026-05-23T00:00:00Z
Decision: commit-artifact
Integrity score: 100

## Upload Coverage

Chunks: 3/3
Coverage: 100%
Bytes: 3072/3072
Findings: 0

## Findings

- None

## Required Actions

- None
