# Knowledge Graph Conflict Arbiter

This is a self-contained module for SCIBASE issue #17, focused on trust operations for Scientific Knowledge Graph Integration.

The module arbitrates contradictory scientific knowledge graph relationships before they flow into graph search, entity pages, or AI research recommendations. It groups extracted relationship triples, scores evidence by confidence, evidence type, citation count, and freshness, then decides whether to accept, quarantine, suppress, or send an edge for low-confidence review.

## What It Covers

- Relationship grouping for subject/predicate/object graph triples.
- Support/refute polarity handling for contradictory scientific claims.
- Evidence scoring for replicated experiments, replication failures, dataset lineage, curator assertions, and weak text mentions.
- Recommendation suppression when dependent graph edges are quarantined or suppressed.
- Curator action packets for conflict review, relationship suppression, and low-confidence evidence.
- Deterministic audit hashes for relationship evidence and full arbitration packets.

## Demo

Run npm run check, npm test, and npm run demo from this directory.

Expected demo output includes relationship groups, conflicts, quarantined relationships, suppressed recommendations, curator actions, and an audit digest.

The reviewer-facing visual is in docs/demo.svg; a short demo video is in docs/demo.mp4.

## Files

- src/conflict-arbiter.js - deterministic graph arbitration logic.
- data/sample-graph.json - synthetic scientific graph entities, relationships, and recommendations.
- test/conflict-arbiter.test.js - Node assert coverage for conflict quarantine, accepted lineage, weak evidence review, and recommendation suppression.
- scripts/demo.js - terminal demo for reviewers.
- docs/requirement-map.md - maps this module to issue #17 requirements.

## Safety Notes

No live ontology, DOI, PubMed, Crossref, LLM, private research, credential, or external service is used. All graph data is synthetic.
