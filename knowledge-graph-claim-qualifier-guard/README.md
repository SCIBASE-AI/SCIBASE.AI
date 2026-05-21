# Knowledge Graph Claim Qualifier Guard

This module is a focused slice for issue #17, Scientific Knowledge Graph Integration. It validates extracted graph edges before they are published to entity pages, discovery mode, or recommendation payloads.

It is intentionally not another extractor, graph navigator, freshness checker, diversity guard, or ontology alias module. The guard focuses on claim qualification:

- causal predicates backed only by associative evidence
- negative or null-result evidence missing explicit polarity
- recommendation copy that overstates the evidence
- graph edges missing required experimental context qualifiers

The output is a deterministic curator packet with blockers, warnings, held edge IDs, publishable edge IDs, and a release recommendation.

## Run

```bash
node knowledge-graph-claim-qualifier-guard/test.js
node knowledge-graph-claim-qualifier-guard/demo.js
```

The demo writes:

- `reports/claim-qualifier-packet.json`
- `reports/claim-qualifier-report.md`
- `reports/summary.svg`
- `reports/summary.png`
- `reports/demo.mp4`

## Design Notes

- Dependency-free Node.js implementation.
- Synthetic data only. No external services or credentials.
- Blocks publication of unsafe graph edges while allowing well-qualified controlled-experiment edges through.
