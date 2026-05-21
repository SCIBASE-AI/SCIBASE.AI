# Knowledge Graph Claim Qualifier Guard Report

Graph: pubmed-crispr-neuro-graph
Status: hold_claim_edges
Generated: 2026-05-21T09:50:00.000Z

## Summary

- Edges checked: 3
- Blockers: 3
- Warnings: 3
- Held edges: 2
- Publishable edges: 1

## Recommendation

Hold unsafe graph edges and downgrade or qualify claims before publication.

## Blockers

- edge-overclaim-001: causal_overclaim_from_association - Associational evidence cannot publish as a causal graph edge.
- edge-overclaim-001: unsupported_recommendation_language - Recommendation text is stronger than the linked evidence supports.
- edge-negative-002: missing_negative_result_polarity - Negative or inconclusive evidence needs explicit graph-edge polarity.

## Edge Decisions

- edge-overclaim-001: CRISPR inhibition protocol causes improved neuronal repair -> hold
- edge-negative-002: Method X increases reproducibility score -> hold
- edge-ready-003: Assay calibration protocol improves measurement consistency -> publish
