# Requirements Map

## Issue #17: Scientific Knowledge Graph Integration

| Requirement | Coverage |
| --- | --- |
| Entity extraction and typed graph nodes | `buildReplicationSignalGraph` creates typed claim, concept, method, dataset, protocol, paper, and replication-signal nodes from structured scientific objects. |
| Linked data and schema.org-compatible metadata | `createEntityPage` emits a schema.org JSON-LD packet with replication treatment and score metadata. |
| Knowledge navigation | `queryGraph` filters claim summaries by domain, score, and recommendation treatment, enabling graph journeys such as suppressed claims or caution-only findings. |
| AI research recommendations | `recommendationDigest` ranks claims while attaching treatment and rationale so AI recommendations do not promote contradicted claims. |
| Reproducibility and evidence context | Replication reports score method match, sample overlap, preregistration, protocol availability, and lab independence before changing recommendation treatment. |
| Knowledge gaps and underexplored intersections | `publicationBiasAlerts` identifies domains with high-confidence claims but no registered null/failed replication evidence. |
| Entity pages with aggregated data | `createEntityPage` includes relationships, replication signals, required curator actions, JSON-LD, and a replication score. |
| Tests and demo | `test.js` covers positive support, failed replication suppression, inconclusive caution, query behavior, schema output, and edge evidence quality. `demo.js` emits JSON and SVG artifacts. |

## Acceptance Notes

- Synthetic data only; no external service calls or private data.
- No dependencies beyond Node.js standard library.
- Failed replications and negative results are explicit graph nodes, not comments or untyped metadata.
- Strong failed replication evidence suppresses AI recommendation output while preserving an auditable entity page for reviewers.
