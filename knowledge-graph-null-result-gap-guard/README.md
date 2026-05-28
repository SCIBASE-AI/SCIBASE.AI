# Knowledge Graph Null Result Gap Guard

This standalone SCIBASE issue #17 slice reviews scientific knowledge graph
signals before discovery-mode recommendations, graph search, or weekly digests.

It checks:

- Null, negative, inconclusive, and failed-replication evidence is preserved.
- Recommendation candidates do not hide mixed or failed replication evidence.
- Null results include citation and context evidence before surfacing.
- Underexplored concept intersections are surfaced as knowledge gaps.
- Audit logs redact emails and token-like values from reviewer packets.

## Run

```bash
node knowledge-graph-null-result-gap-guard/test.js
node knowledge-graph-null-result-gap-guard/demo.js
python knowledge-graph-null-result-gap-guard/make-demo-video.py
```

Generated reviewer artifacts are written under `reports/`.
