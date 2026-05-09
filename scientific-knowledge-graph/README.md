# Scientific Knowledge Graph

This module is a self-contained implementation for SCIBASE.AI issue #17. It turns uploaded research objects into a structured graph of papers, datasets, notebooks, protocols, concepts, authors, tools, ontologies, DOIs, and institutions.

## What It Covers

- Entity extraction across papers, datasets, notebooks, and protocols.
- Concepts, authors, affiliations, tools, software libraries, cited DOIs, and ontology-backed entities.
- Linked data graph nodes, edges, and schema.org-compatible metadata.
- Entity pages with usage contexts, citations, and relationships.
- Knowledge navigation queries for dataset citations, CRISPR/protocol intersections, notebook reuse, and institution/domain filtering.
- AI research recommendations using user interests, project activity, graph proximity, citation counts, and reproducibility signals.
- Browser dashboard and JSON API for reviewer smoke testing.

## Run Locally

```bash
cd scientific-knowledge-graph
npm test
npm start
```

Then open `http://localhost:4131`.

## API Surface

- `GET /api/dashboard`
- `GET /api/graph`
- `GET /api/query?q=CRISPR`
- `GET /api/entities/concept-crispr`
- `GET /api/recommendations`

## Requirement Mapping

- Entity extraction: implemented by `extractEntities`.
- Linked data and schema.org metadata: implemented by `buildGraph`.
- Entity pages: implemented by `buildEntityPage`.
- Interactive graph search/navigation: implemented by `queryGraph` and rendered in the dashboard.
- Dynamic node types and filters: implemented across object/entity node types plus domain, institution, type, and reproducibility filters.
- Personalized recommendations: implemented by `recommendResearch`.
- Sidebar/digest/discovery-mode style outputs: represented as recommendation payloads and dashboard cards.

## Verification

```bash
npm test
node src/server.js
```

Optional smoke checks:

```bash
curl -s http://localhost:4131/api/dashboard
curl -s "http://localhost:4131/api/query?q=CRISPR"
curl -s http://localhost:4131/api/entities/concept-crispr
```

Demo artifacts are committed under `docs/demo/`, including `dashboard.png` and `scientific-knowledge-graph-demo.mp4`.
