# Requirement Map

| Scientific Knowledge Graph requirement | Implementation |
| --- | --- |
| Linked scientific entities | `graphNodes` model papers, datasets, titles, types, and ontology concept identifiers. |
| Relationships and evidence | `relationships` include source/target nodes, relationship type, concept tags, DOI evidence, and evidence dates. |
| Entity normalization | Deprecated concept mappings produce explicit migration actions from old identifiers to replacement concepts. |
| Graph search and recommendations | Synonym collisions and stale recommendation paths are flagged before search expansion or recommendation reuse. |
| Recommendation provenance | Active recommendations record concept paths and are invalidated when those paths depend on deprecated concepts. |
| Ontology-backed governance | `analyzeOntologyDrift` returns findings, migration actions, impact score, release versions, and an audit digest. |

## Demo Video

The PR includes `docs/ontology-drift-demo.mp4`, a real terminal walkthrough running the local check, test, and demo scripts.
