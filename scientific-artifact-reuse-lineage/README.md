# Scientific Artifact Reuse Lineage

This module adds a focused Scientific Knowledge Graph slice for issue #17. It maps reuse paths between datasets, notebooks, protocols, projects, and papers, then explains why each relationship is trusted enough to power knowledge navigation and recommendations.

The implementation is dependency-free and uses synthetic sample data only. It does not call external APIs, require credentials, or rely on live ontology services.

## What It Covers

- Artifact-centric graph nodes for datasets, notebooks, protocols, projects, papers, authors, concepts, and tools.
- Evidence-scored relationships such as `cites`, `reuses`, `derives`, `executes`, and `usesProtocol`.
- Navigation queries for common knowledge graph questions:
  - dataset -> projects and papers that reused it
  - notebook -> experiments that executed it
  - protocol -> projects and papers that depended on it
- Recommendation payloads that include evidence paths, confidence, and suppression reasons.
- Curator action queues for stale, weak, conflicting, or missing-license lineage evidence.
- Requirement mapping and a visual demo artifact for reviewers.

## Run

```bash
npm test
npm run build-demo
npm run demo
```

The demo prints a reviewer-ready JSON payload with graph stats, lineage queries, recommendations, and curator actions.

## Files

- `src/artifact-reuse-lineage.js` - core graph builder and scoring engine
- `data/sample-lineage.json` - synthetic research graph input
- `test/artifact-reuse-lineage.test.js` - focused Node test coverage
- `scripts/demo.js` - CLI demo
- `docs/requirement-map.md` - issue requirement mapping
- `docs/demo.svg` - lightweight visual walkthrough artifact
- `docs/demo.gif` - generated short demo animation
