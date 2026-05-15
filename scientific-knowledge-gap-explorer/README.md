# Scientific Knowledge Gap Explorer

Standalone SCIBASE knowledge graph module for finding underexplored research intersections.

The module turns project metadata into typed graph nodes, builds weighted co-occurrence edges, and ranks concept-method-dataset gaps that are not yet directly studied but have enough supporting graph evidence to justify a review workspace.

## What it covers

- Typed entities for concepts, methods, datasets, tools, authors, institutions, domains, and citations.
- Entity pages with related projects, citations, and nearby graph nodes.
- Sparse knowledge-gap scoring for underconnected research neighborhoods.
- Evidence paths for every recommendation so reviewers can inspect why it was suggested.
- Personalized recommendation digest based on a user's interests.
- Local tests and a generated demo artifact with no credentials or external services.

## Run locally

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `docs/demo-output.json`
- `docs/demo.svg`
- `docs/demo.mp4` after rendering the SVG into the submitted video artifact

## Core API

```js
const {
  buildKnowledgeGraph,
  findKnowledgeGaps,
  buildRecommendationDigest,
  buildEntityPage,
  queryGraph
} = require("./src/knowledge-gap-explorer");
```

## Why this is distinct

Most knowledge graph submissions focus on extraction, linked data, or graph search. This slice focuses on discovery operations: finding sparse but high-evidence research intersections and explaining recommendation provenance so researchers can decide what to explore next.
