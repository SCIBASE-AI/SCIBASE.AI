# Requirement Map

| Issue #17 requirement | Implementation evidence |
| --- | --- |
| Entity extraction | `extractEntities` extracts concepts, authors, institutions, tools, datasets, protocols, funders, and DOIs. |
| Linked data and schema.org metadata | `buildJsonLdExport` emits schema.org/JSON-LD graph payloads. |
| Entity pages | `buildEntityPage` aggregates citations, projects, contexts, and connected edges. |
| Knowledge navigation | `searchGraph` supports type/domain/institution/citation/reproducibility filters. |
| Dynamic node types | `NODE_TYPES` and extracted node records. |
| Relationship graph | `buildKnowledgeGraph` creates evidence-backed edges. |
| AI research recommendations | `buildRecommendations` ranks related methods, datasets, collaborators, and unresolved questions. |
| Personalized feed | Recommendations use interests, project history, and graph co-occurrence. |
| Sidebar/digest/discovery payloads | `buildRecommendations` returns `surface` fields for sidebar, digest, and discovery mode. |
