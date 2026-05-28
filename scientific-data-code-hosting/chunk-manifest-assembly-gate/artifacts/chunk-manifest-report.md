# Chunk Manifest Assembly Gate

## Summary

- Manifests reviewed: 5
- Ready: 2
- Blocked: 3
- Findings: 4

## Reports

### dataset-clean

- File: single-cell-counts.parquet
- Decision: ready
- Chunks: 3
- Declared bytes: 300

### dataset-gap

- File: instrument-raw.bin
- Decision: block
- Chunks: 2
- Declared bytes: 300
  - block: chunk_gap - dataset-gap is missing bytes 100-149.

### dataset-overlap

- File: microscopy-stack.tiff
- Decision: block
- Chunks: 2
- Declared bytes: 280
  - block: chunk_overlap - chunk-2 overlaps an earlier chunk at byte 120.

### dataset-digest

- File: model-weights.bin
- Decision: block
- Chunks: 2
- Declared bytes: 200
  - block: chunk_digest_mismatch - chunk-2 digest sha256:actual-b does not match registry sha256:expected-b.

### dataset-hold

- File: supplement.csv
- Decision: ready
- Chunks: 1
- Declared bytes: 100
  - hold: missing_final_digest - dataset-hold does not include a final artifact digest.

