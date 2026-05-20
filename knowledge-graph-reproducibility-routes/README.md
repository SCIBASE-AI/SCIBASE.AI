# Knowledge Graph Reproducibility Routes

Self-contained milestone for SCIBASE.AI issue #17, Scientific Knowledge Graph
Integration.

This module turns typed knowledge-graph entities into reproducibility-oriented
navigation paths. A route connects a concept or method to protocols, datasets,
notebooks, software, and result artifacts, then scores whether the path is
ready for a researcher to rerun or reuse.

## What It Covers

- Typed graph nodes for concepts, protocols, datasets, notebooks, software,
  results, projects, and authors.
- Evidence-backed relationships with freshness, access, citation, and
  reproducibility metadata.
- Route scoring that rewards strong evidence and executable rerun readiness.
- Blocker and curator action output for weak, stale, private, or non-runnable
  graph paths.
- Recommendation digests for project sidebars, discovery mode, and weekly
  knowledge graph summaries.
- Synthetic sample data only; no network calls, credentials, or external
  services.

## Files

- `index.js` - route scoring and recommendation engine.
- `demo.js` - terminal demo for candidate route ranking.
- `test.js` - dependency-free regression tests.
- `demo.mp4` - short demo artifact for bounty review.

## Run

```sh
node knowledge-graph-reproducibility-routes/test.js
node knowledge-graph-reproducibility-routes/demo.js
```

## Requirement Map

| Issue #17 Requirement | Implementation |
| --- | --- |
| Entity extraction and linked data | The module consumes typed entity nodes with evidence and ontology metadata, then emits route packets with stable audit digests. |
| Knowledge navigation | `findReproducibilityRoutes()` supports concept-to-result and notebook-reuse style graph journeys with domain/time/access filters. |
| Dynamic node types | Sample and tests include concepts, protocols, datasets, notebooks, software, results, projects, and authors. |
| Filters by domain, time, citation count, reproducibility | Route filtering uses `domain`, `minCitationCount`, `maxEvidenceAgeDays`, `access`, and `minScore`. |
| AI research recommendations | `buildRecommendationDigest()` converts ranked graph paths into sidebar/discovery recommendations with reasons and blockers. |
| Entity pages and usage contexts | Route packets include `path`, `usageContexts`, `evidence`, and `curatorActions` for entity pages and graph drilldowns. |
