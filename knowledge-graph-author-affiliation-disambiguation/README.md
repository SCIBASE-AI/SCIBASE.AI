# Knowledge Graph Author Affiliation Disambiguation

Self-contained module for issue `#17` Scientific Knowledge Graph Integration.

It adds a deterministic trust layer for author and affiliation entities before they are used in entity pages, collaboration maps, semantic search, or AI recommendations.

## What It Does

- Normalizes author names, initials, ORCID values, email domains, affiliations, and scientific concepts.
- Merges author mentions when there is strong evidence from ORCID, affiliation, domain, and topic overlap.
- Sends homonyms and low-confidence merges to a curator queue instead of polluting the graph.
- Builds collaboration edges from shared document evidence.
- Produces recommendation guards so uncertain identities do not drive cross-lab suggestions.
- Exports schema.org-compatible creator metadata.

## Demo

```bash
npm run check
npm test
npm run demo
```

The sample dataset intentionally contains two different `Maya Chen` authors. The Stanford CRISPR author is merged across paper, dataset, and protocol mentions, while the MIT materials-science homonym is routed to curator review.

## Why This Belongs in the Knowledge Graph

The issue calls out authors, affiliations, entity pages, lab-to-lab collaboration maps, graph navigation, and personalized recommendations. Those features depend on author identity quality. A graph that merges homonyms or splits the same author across affiliations will produce misleading entity pages, false collaboration paths, and bad recommendation digests.

This slice complements broad extractors and navigators by adding identity-quality controls before graph edges are trusted.
