# Knowledge Graph Ontology Drift

This module adds a focused Scientific Knowledge Graph Integration control for reviewing ontology release drift before graph data, recommendations, and linked entity pages are migrated.

## What it checks

- Deprecated ontology concepts still referenced by graph nodes or relationships
- Replacement concept validity
- Synonym collisions that can corrupt entity search or recommendation expansion
- Active recommendation paths that depend on deprecated concepts
- Relationship evidence freshness
- Migration actions for nodes, relationships, and recommendations
- Impact scoring and deterministic audit digest for graph review

## Run locally

```bash
npm run check
npm test
npm run demo
```

The sample data intentionally includes one deprecated concept still in use, a synonym collision, a stale recommendation path, and one relationship with stale evidence.
