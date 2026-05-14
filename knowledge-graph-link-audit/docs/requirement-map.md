# Requirement Map

This module addresses SCIBASE issue #17 by adding a trust and maintenance layer for scientific knowledge graph integration.

| Issue requirement | Implementation evidence |
| --- | --- |
| Entity extraction and normalization | `buildNormalizedEntities()` turns concepts, datasets, authors, tools, and protocols into canonical graph nodes with ontology IDs, aliases, DOI/ORCID IDs, and schema.org types. |
| Ontology-backed named entities | `normalizeEntityLabel()` and `ontologyAliases` support aliases for CRISPR-Cas9, scRNA-seq, organoids, PubChem-style IDs, and tools. |
| Linked data and schema.org metadata | `buildJsonLdExport()` emits schema.org JSON-LD with stable IDs and identifiers. |
| Entity pages and aggregated contexts | Normalized entity payloads include source IDs, JSON-LD IDs, schema types, and confidence metadata. |
| Graph navigation and search | `explainGraphQuery()` normalizes query terms, matches graph entities, filters trusted relationships, and returns explanation steps. |
| Relationship evidence | `scoreRelationshipEvidence()` and `auditRelationships()` score relationships by confidence, source diversity, evidence volume, and freshness. |
| Dynamic node types | Sample graph includes concepts, datasets, authors, tools, and protocols. |
| Filters by reproducibility and confidence | Query explanation applies minimum relationship evidence score and current-status filtering. |
| AI research recommendations | `buildRecommendationProvenance()` produces recommendation candidates with score and why-signals. |
| Recommendation transparency | Recommendations include connected relationship IDs, ontology IDs, DOI IDs, and a provenance hash. |
| Citation/reference integrity | `auditReferences()` detects superseded DOI references and remediation actions. |
| Graph maintenance workflows | `buildRemediationQueue()` creates entity merge, relationship repair, and reference refresh work items. |
| Reviewer-ready local demo | `src/server.js`, tests, README commands, and `demo/demo-text.txt` expose reproducible local API validation. |

## Differentiation From Existing #17 PRs

Existing #17 submissions mostly implement extractors, graph navigators, search endpoints, entity pages, or recommendation demos. This module focuses on the operational trust layer required to keep a knowledge graph accurate over time: entity merge suggestions, stale relationship repair, superseded DOI checks, query explanations, recommendation provenance, and remediation queues.
