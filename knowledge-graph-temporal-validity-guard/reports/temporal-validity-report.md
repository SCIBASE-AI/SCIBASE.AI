# Knowledge Graph Temporal Validity Guard

This reviewer packet checks whether graph nodes, relationship edges, dataset versions, method applicability windows, author affiliations, and recommendation paths are valid for the graph snapshot date before entity pages or AI recommendations are shown.

| Graph | Status | Blockers | Review items | Suppressed recommendations | Digest |
| --- | --- | ---: | ---: | ---: | --- |
| kg-temporal-review-2026-05 | hold_temporal_review | 6 | 1 | 2 | sha256:7abaeae1e266b2772822a7799e80bd64e017f52369350e102a7b3641ef486371 |
| kg-temporal-2026-05 | temporal_ready | 0 | 0 | 0 | sha256:3dd829ed8fb5ed4d46fd3f3043f111f67068e6bca0175514b6f4966b49349797 |

## Findings

- kg-temporal-review-2026-05: NODE_EXPIRED on node `dataset-scrna-v2` - Node dataset-scrna-v2 expired before 2026-05-23.
- kg-temporal-review-2026-05: NODE_NOT_YET_EFFECTIVE on node `dataset-scrna-v4` - Node dataset-scrna-v4 is not effective on 2026-05-23.
- kg-temporal-review-2026-05: EDGE_EXPIRED on edge `edge-expired-dataset` - Edge edge-expired-dataset expired before 2026-05-23.
- kg-temporal-review-2026-05: EVIDENCE_VERSION_DRIFT on edge `edge-expired-dataset` - Edge edge-expired-dataset cites v1, but target dataset-scrna-v2 is v2.
- kg-temporal-review-2026-05: EDGE_NOT_YET_EFFECTIVE on edge `edge-future-dataset` - Edge edge-future-dataset is not effective on 2026-05-23.
- kg-temporal-review-2026-05: EVIDENCE_VERSION_DRIFT on edge `edge-paper-method` - Edge edge-paper-method cites v1, but target method-scrna-normalization-v2 is v2.
- kg-temporal-review-2026-05: AFFILIATION_EXPIRED on edge `edge-author-affiliation` - Affiliation edge edge-author-affiliation expired and needs curator review.

## Scope Boundaries

- Synthetic graph fixtures only.
- No network calls, live ontology APIs, private research objects, or graph database mutations.
- Distinct from evidence freshness: this guard checks effective/expiry windows and version validity for graph objects at a specific snapshot date.
