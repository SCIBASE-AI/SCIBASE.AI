# Requirement Map

This maps issue #17 to concrete files in this module.

| Issue requirement | Implementation |
| --- | --- |
| Parse uploaded papers, datasets, notebooks, and protocols | `data/sample-corpus.json` models all four object kinds; `extractScientificEntities()` accepts the same shape for future uploads. |
| Extract concepts, authors, affiliations, tools, DOIs, ontologies | `src/knowledge-graph.js` extracts each entity group and normalizes typed graph nodes. |
| Output linked data and schema.org metadata | `buildSchemaOrg()` returns a JSON-LD graph for all research objects and entities. |
| Entity pages with aggregated context | `buildEntityPages()` aggregates citations, domains, usage contexts, and relationships per entity. |
| Graph-based search and navigation | `queryGraph()` supports text, type, domain, reproducibility, and seed-neighborhood filters. |
| Dynamic node types | The graph includes papers, datasets, notebooks, protocols, concepts, authors, institutions, tools, DOIs, and ontologies. |
| AI research recommendations | `recommendResearch()` returns ranked sidebar/digest/discovery payloads with score reasons. |
| Reviewer-ready demo | `src/server.js`, `public/`, and `scripts/export-demo-snapshot.js` provide a browser demo, JSON API, and repeatable snapshot artifact. |
| Validation | `test/knowledge-graph.test.js` covers extraction, graph construction, search, metadata, and recommendations. |

The implementation is intentionally self-contained so it can be reviewed without changing the repository's existing event-operations folders.
