# Scientific Knowledge Graph

Self-contained implementation milestone for [SCIBASE.AI issue #17](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/17).

It models scientific content as linked data:

- deterministic entity extraction from papers, datasets, notebooks, protocols, and references
- typed nodes for concepts, authors, institutions, tools, datasets, protocols, funders, and DOIs
- evidence-backed relationship edges
- entity pages with usage contexts, citations, and connected projects
- graph search and filters by node type, domain, institution, citation count, reproducibility, and time
- personalized recommendations from interests, project activity, co-occurrence, and unresolved questions
- schema.org/JSON-LD export
- dependency-free JSON API/demo server

## Run

```bash
cd scientific-knowledge-graph
npm run check
npm test
npm start
```

Open `http://localhost:4330` or inspect:

```bash
curl -s http://localhost:4330/api/entities
curl -s http://localhost:4330/api/relationships
curl -s http://localhost:4330/api/search
curl -s http://localhost:4330/api/recommendations
curl -s http://localhost:4330/api/jsonld
```

## Implementation Notes

The current extractor is deterministic so maintainers can inspect the graph-building rules. A production adapter can later replace extraction with PubMed/arXiv/Crossref/vector models while preserving node, edge, search, and recommendation payloads.

## Files

- `src/graph.js` - entity extraction, graph building, search, entity pages, recommendations, JSON-LD.
- `src/sample-data.js` - representative scientific content and user profile.
- `src/server.js` - local API and reviewer dashboard.
- `test/graph.test.js` - Node tests for knowledge graph workflows.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The implementation and tests were run locally before submission.
