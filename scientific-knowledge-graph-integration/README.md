# Scientific Knowledge Graph Integration

Self-contained implementation for [SCIBASE.AI issue #17](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/17).

The module turns uploaded research objects into a typed scientific knowledge graph with entity extraction, linked metadata, entity pages, graph search, filters, and recommendation payloads.

## Quick Start

```bash
cd scientific-knowledge-graph-integration
npm test
npm run snapshot
npm start
```

Open `http://localhost:4177` to inspect the demo dashboard and API-backed graph views.

## What Is Included

- Entity extraction for concepts, authors, affiliations, software tools, datasets, protocols, DOIs, and ontology terms.
- Linked graph construction with typed nodes, relationships, usage contexts, and schema.org JSON-LD export.
- Entity pages that aggregate citations, source documents, relationship summaries, and recommendation context.
- Knowledge navigation queries with text, node type, domain, reproducibility, and seed-entity filters.
- AI recommendation payloads for project sidebars, weekly digest email, and discovery-mode UI.
- Dependency-free Node.js demo API, browser dashboard, tests, and snapshot export.

## API Demo

After `npm start`:

```bash
curl -s http://localhost:4177/api/dashboard
curl -s "http://localhost:4177/api/query?q=CRISPR"
curl -s http://localhost:4177/api/entities/concept-crispr
curl -s http://localhost:4177/api/recommendations
```

## Requirement Mapping

See [docs/requirement-map.md](docs/requirement-map.md) for the issue-by-issue mapping and [docs/demo-script.md](docs/demo-script.md) for a short reviewer walkthrough.
