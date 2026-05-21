# Knowledge Graph Recommendation Diversity Guard

This module is a focused Scientific Knowledge Graph Integration slice for issue #17. It validates discovery-mode recommendation sets before researchers see them, so graph suggestions do not collapse into one institution, funder, method, or stale citation cluster.

The guard checks:

- institution, funder, domain, and method concentration
- citation-herd dominance by one highly cited node
- stale evidence dominance
- missing recommendation rationale paths
- too few visible recommendations for exploratory discovery
- per-recommendation curator actions for weak graph suggestions

It uses only Node.js built-ins and synthetic data.

## Run

```bash
node knowledge-graph-recommendation-diversity-guard/test.js
node knowledge-graph-recommendation-diversity-guard/demo.js
```

The demo writes reviewer artifacts to `knowledge-graph-recommendation-diversity-guard/reports/`.
