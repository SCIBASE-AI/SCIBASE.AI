# Requirement Map

This module targets issue `#17` Scientific Knowledge Graph Integration.

| Issue capability | Implementation |
| --- | --- |
| Parse authors and affiliations from uploaded content | `createAuthorGraph()` accepts author mentions from papers, datasets, notebooks, or protocols and normalizes names, affiliations, ORCID values, email domains, concepts, and DOI evidence. |
| Build author graphs and collaboration maps | `buildCollaborationEdges()` creates weighted collaboration edges from shared document evidence and shared concept context. |
| Aggregate usage contexts for entity pages | Author nodes include mention IDs, source documents, concepts, affiliations, and merge evidence for entity-page rendering. |
| Support semantic graph recommendations | `recommendationGuards` suppresses recommendations when identity confidence is not sufficient, preventing unsafe cross-lab suggestions. |
| Output linked data / schema.org metadata | `toSchemaOrg()` exports creator metadata with schema.org `Person` and `Organization` structures. |
| Human review for ambiguous graph edges | `curatorQueue` captures homonyms and low-confidence merge candidates with transparent scoring reasons. |

## Distinctness

This slice is intentionally narrower than broad knowledge graph extractors and navigators. It focuses on author identity, affiliation normalization, homonym safety, and collaboration-edge trust, which are prerequisites for accurate author graphs, lab-to-lab maps, and personalized recommendations.
