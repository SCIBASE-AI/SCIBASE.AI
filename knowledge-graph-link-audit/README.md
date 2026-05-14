# Knowledge Graph Link Audit

Self-contained Scientific Knowledge Graph Integration module for SCIBASE issue #17. It focuses on graph trust operations: ontology-backed entity normalization, duplicate merge suggestions, relationship evidence scoring, DOI/reference freshness, graph query explanations, recommendation provenance, stale-link remediation queues, schema.org JSON-LD export, and reviewer-ready audit packets.

## Scope

- Normalize scientific entities with ontology IDs, aliases, DOI IDs, ORCID IDs, and schema.org types.
- Suggest duplicate entity merges from shared ontology IDs or normalized labels.
- Score graph relationships by evidence confidence, evidence volume, and source diversity.
- Detect stale, weak, or broken relationships that need verification.
- Audit DOI/reference freshness and flag superseded references.
- Explain graph queries by showing term normalization, matched entities, and trusted edge filters.
- Generate recommendation provenance so users can see why a paper, dataset, tool, or protocol was suggested.
- Build remediation queues for entity merges, stale relationships, weak evidence, and reference refreshes.
- Export JSON-LD for schema.org-compatible discovery.
- Expose local API endpoints and tests for reviewer validation.

No LLM API, vector database, search cluster, DOI provider, or external ontology service is required. The module runs entirely from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4367 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4367/api/health
curl -fsS http://localhost:4367/api/entities
curl -fsS http://localhost:4367/api/merges
curl -fsS http://localhost:4367/api/relationships
curl -fsS http://localhost:4367/api/references
curl -fsS 'http://localhost:4367/api/query-explanation?id=query-crispr-scrna'
curl -fsS http://localhost:4367/api/recommendations
curl -fsS http://localhost:4367/api/remediation-queue
curl -fsS http://localhost:4367/api/jsonld
curl -fsS http://localhost:4367/api/audit-packet
```

## Demo Flow

1. Open `/api/entities` to inspect normalized graph nodes and schema.org types.
2. Open `/api/merges` to see duplicate entity merge suggestions.
3. Open `/api/relationships` and `/api/references` to review stale relationships, weak evidence, and superseded DOI references.
4. Open `/api/query-explanation?id=query-crispr-scrna` to see how a graph query is normalized and filtered.
5. Open `/api/recommendations` to inspect recommendation provenance.
6. Open `/api/remediation-queue` and `/api/audit-packet` for reviewer-ready graph maintenance evidence.

See `docs/requirement-map.md` for issue requirement coverage.
