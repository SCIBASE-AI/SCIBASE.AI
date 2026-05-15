# Requirement map

This module targets SCIBASE issue #17, Scientific Knowledge Graph Integration, with a focused knowledge-gap explorer rather than another broad extractor.

## Entity extraction

- Normalizes concepts, methods, datasets, tools, authors, institutions, domains, and DOI citations into typed graph nodes.
- Preserves project and citation provenance on every node so entity pages can explain where an entity appears.
- Uses deterministic fixtures and validation so reviewer behavior is reproducible without external APIs.

## Knowledge navigation

- Builds weighted co-occurrence edges across project entities.
- Exposes `queryGraph` for typed graph search and `buildEntityPage` for entity pages with related entities, projects, and citations.
- Surfaces underconnected concept-method-dataset neighborhoods where no project currently uses the full triple but the surrounding graph has evidence.

## AI research recommendations

- Ranks knowledge gaps with evidence strength, recent-project support, reproducibility, and sparsity.
- Generates an evidence explanation for each recommendation instead of opaque scoring.
- Personalizes digests by boosting candidates that match a researcher's stated interests.

## Reviewer workflow

- `npm run check` validates graph coverage and prevents direct triples from being mislabeled as gaps.
- `npm test` covers graph construction, sparse-intersection ranking, citation evidence, personalization, entity pages, and search.
- `npm run demo` writes `docs/demo-output.json` and `docs/demo.svg`; `docs/demo.mp4` is generated from the SVG for the Algora demo-video requirement.
