# Benchmark Contamination Graph Guard Report

Generated: 2026-08-15T21:57:22.692Z
Packets analyzed: 4
Decision counts: PUBLISH 1, REVIEW 1, HOLD 2

## Findings

### benchmark-publish-001: Clean independent benchmark edge for microscopy segmentation model

Decision: PUBLISH
Risk score: 0
Benchmark claim edges: 1
Contamination edges: 1

- No benchmark contamination risk detected.

Recommended actions:
- Publish benchmark graph edge and recommendation with normal provenance metadata.

### benchmark-hold-002: Benchmark reused in model pretraining and public recommendation

Decision: HOLD
Risk score: 100
Benchmark claim edges: 1
Contamination edges: 1

- CRITICAL DIRECT_TRAINING_BENCHMARK_OVERLAP: The model graph links training or pretraining data directly to the claimed benchmark.
- CRITICAL TRAIN_EVAL_SPLIT_HASH_COLLISION: Training and evaluation split hashes overlap.
- CRITICAL LABEL_SOURCE_LEAKAGE: Training labels and benchmark labels share a source that can leak answers into evaluation.
- MAJOR BENCHMARK_PREDATES_TRAINING_CUTOFF: The benchmark was released before the model training cutoff, increasing contamination risk.
- MAJOR INDEPENDENT_HOLDOUT_EVIDENCE_MISSING: The packet lacks complete independent holdout evidence for the benchmark claim.
- CRITICAL UNSAFE_RECOMMENDATION_PATH_NOT_FROZEN: Entity-page or recommendation publication is enabled while contamination risk is unresolved.

Recommended actions:
- Freeze model recommendation paths and entity-page benchmark badges.
- Attach contamination findings to the graph curation queue.
- Downgrade or suppress benchmark-confidence badges until evidence is resolved.
- Generate a reviewer packet with split, label-source, and edge-provenance evidence.

### benchmark-review-003: Older benchmark with missing holdout lock evidence

Decision: REVIEW
Risk score: 44
Benchmark claim edges: 1
Contamination edges: 1

- MAJOR BENCHMARK_PREDATES_TRAINING_CUTOFF: The benchmark was released before the model training cutoff, increasing contamination risk.
- MAJOR INDEPENDENT_HOLDOUT_EVIDENCE_MISSING: The packet lacks complete independent holdout evidence for the benchmark claim.

Recommended actions:
- Attach contamination findings to the graph curation queue.
- Downgrade or suppress benchmark-confidence badges until evidence is resolved.
- Generate a reviewer packet with split, label-source, and edge-provenance evidence.

### benchmark-hold-004: Label source leakage without direct dataset edge

Decision: HOLD
Risk score: 92
Benchmark claim edges: 1
Contamination edges: 1

- CRITICAL LABEL_SOURCE_LEAKAGE: Training labels and benchmark labels share a source that can leak answers into evaluation.
- MAJOR INDEPENDENT_HOLDOUT_EVIDENCE_MISSING: The packet lacks complete independent holdout evidence for the benchmark claim.
- CRITICAL UNSAFE_RECOMMENDATION_PATH_NOT_FROZEN: Entity-page or recommendation publication is enabled while contamination risk is unresolved.

Recommended actions:
- Freeze model recommendation paths and entity-page benchmark badges.
- Attach contamination findings to the graph curation queue.
- Downgrade or suppress benchmark-confidence badges until evidence is resolved.
- Generate a reviewer packet with split, label-source, and edge-provenance evidence.
