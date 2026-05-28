# Recommendation Path Audit: Neuroinflammation Discovery Graph

- Decision: hold-recommendations
- Risk score: 100
- Nodes reviewed: 6
- Edges reviewed: 4
- Recommendations reviewed: 5
- Audit digest: 0a7733f83578eac8

## Findings

- [critical] PRIVATE_NODE_LEAK (rec-001)
  - rec-001 exposes private or embargoed nodes: dataset-raw-phi, dataset-raw-phi.
  - Recommendation: Remove private or embargoed graph nodes from recommendations and digest payloads.
- [high] FILTER_VIOLATION (rec-002)
  - rec-002 target paper-retracted violates applied user filters.
  - Recommendation: Apply user domain, institution, date, and reproducibility filters before ranking.
- [critical] RETRACTED_SOURCE_USED (rec-002)
  - rec-002 depends on retracted or blocked evidence edges.
  - Recommendation: Suppress recommendations whose path depends on retracted or blocked citations.
- [medium] WEAK_EVIDENCE_SCORE (rec-002)
  - rec-002 evidence score 12 is below policy minimum.
  - Recommendation: Require stronger citation, reuse, or co-occurrence evidence for this suggestion.
- [medium] STALE_TREND_SIGNAL (rec-002)
  - rec-002 uses trend features 31 days old.
  - Recommendation: Refresh trend features before using the recommendation in a weekly digest.
- [high] UNEXPLAINED_PERSONALIZATION (rec-002)
  - rec-002 lacks explainable personalization details.
  - Recommendation: Store the user-facing reason and feature weights for personalized recommendations.
- [high] FILTER_VIOLATION (rec-003)
  - rec-003 target method-graph-rag violates applied user filters.
  - Recommendation: Apply user domain, institution, date, and reproducibility filters before ranking.
- [medium] WEAK_EVIDENCE_SCORE (rec-003)
  - rec-003 evidence score 8 is below policy minimum.
  - Recommendation: Require stronger citation, reuse, or co-occurrence evidence for this suggestion.
- [medium] STALE_TREND_SIGNAL (rec-003)
  - rec-003 uses trend features 19 days old.
  - Recommendation: Refresh trend features before using the recommendation in a weekly digest.
- [high] EXPLANATION_PATH_BROKEN (rec-004)
  - rec-004 explanation path cannot be reconstructed from graph edges.
  - Recommendation: Regenerate the recommendation path from existing graph edges before surfacing it.
- [medium] WEAK_EVIDENCE_SCORE (rec-004)
  - rec-004 evidence score 35 is below policy minimum.
  - Recommendation: Require stronger citation, reuse, or co-occurrence evidence for this suggestion.
- [medium] MISSING_SCHEMA_METADATA (rec-004)
  - tool-missing-schema is missing schema.org-compatible metadata.
  - Recommendation: Attach schema.org-compatible entity metadata before publishing the node.
- [low] DUPLICATE_RECOMMENDATION (rec-005)
  - rec-005 duplicates target from rec-001.
  - Recommendation: Deduplicate equivalent target nodes across workspace sidebar and email digest.
- [critical] PRIVATE_NODE_LEAK (rec-005)
  - rec-005 exposes private or embargoed nodes: dataset-raw-phi, dataset-raw-phi.
  - Recommendation: Remove private or embargoed graph nodes from recommendations and digest payloads.
- [medium] WEAK_EVIDENCE_SCORE (rec-005)
  - rec-005 evidence score 49 is below policy minimum.
  - Recommendation: Require stronger citation, reuse, or co-occurrence evidence for this suggestion.

## Recommendation Gates

- [!] Recommendation paths do not leak private or embargoed nodes.
- [!] Every explanation path is reconstructable from graph edges.
- [!] Applied filters are enforced before ranking.
- [!] No recommendation depends on retracted or blocked evidence.
- [!] Personalized suggestions include user-facing reasons and feature weights.
