# Benchmark Contamination Graph Guard

This contribution adds a focused guardrail for SCIBASE's Scientific Knowledge Graph Integration. It evaluates model-to-benchmark graph edges before entity pages, benchmark badges, or AI recommendations treat an evaluation result as clean independent evidence.

The slice is intentionally narrow. It does not rebuild graph ingestion, entity extraction, ontology aliasing, geospatial provenance, organism or strain boundaries, chemical identity, software dependency provenance, calibration evidence, negative evidence, or recommendation path explanation. It covers the model evaluation leakage question: did the model already see the benchmark, labels, split, or derived data?

## What It Checks

- Model graph edges such as `trained_on`, `pretrained_on`, `fine_tuned_on`, `derived_from`, and `label_source`.
- Benchmark claim edges such as `evaluated_on`, `claims_sota_on`, `recommended_for`, and `compared_against`.
- Direct training/pretraining overlap with the claimed benchmark.
- Training/evaluation split hash collisions.
- Shared training and benchmark label sources.
- Benchmark release date versus model training cutoff.
- Independent holdout evidence, split checksums, and locked evaluation-set evidence.
- Unsafe entity-page and recommendation publication when contamination risk is unresolved.

## Running Locally

```bash
npm test
npm run demo
npm run check
npm run video
```

The demo uses only synthetic graph packets in `data/sample_benchmark_graph_packets.json`.

Generated files:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

The MP4 is generated from an FFmpeg color source and drawtext slate. It is not a screen recording and contains no desktop capture or private information.

## Why This Matters

Knowledge graphs can amplify benchmark claims through entity pages, related-work recommendations, and model/dataset discovery surfaces. If a model was trained on a benchmark, reused its labels, or leaked evaluation examples through derived datasets, the graph should not present that benchmark edge as clean evidence.

This guard gives curators a deterministic review packet so SCIBASE can:

1. Suppress contaminated benchmark badges.
2. Downgrade recommendation confidence.
3. Preserve split and label-source evidence.
4. Require independent holdout proof before publishing model evaluation graph edges.
