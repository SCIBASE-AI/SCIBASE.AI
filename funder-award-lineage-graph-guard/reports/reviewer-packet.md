# Funder Award Lineage Graph Guard

Issue: SCIBASE.AI #17 Scientific Knowledge Graph Integration
Scope: verify funder, award, project, output, mandate, and recommendation lineage before knowledge graph export or recommendation display.

## Graph Decisions

### KG-FUNDER-HOLD-3
Status: HOLD
Required decision: hold_graph_export
Audit digest: `KG-FUNDER-HOLD-3:hold:B=AWARD_FUNDER_NODE_MISSING|AWARD_NUMBER_MISSING|DUPLICATE_FUNDER_AWARD_NUMBER|FUNDED_PROJECT_WITHOUT_AWARD_EDGE|INACTIVE_AWARD_USED_IN_VISIBLE_RECOMMENDATION|OPEN_ACCESS_MANDATE_UNMET|OUTPUT_AWARD_EDGE_MISSING_TARGET|OUTPUT_PROJECT_EDGE_MISSING_TARGET|PROJECT_AWARD_EDGE_MISSING_TARGET|RECOMMENDATION_AWARD_MISSING:W=AWARD_MANDATES_MISSING|AWARD_URI_MISSING|DATA_SHARING_MANDATE_NEEDS_REVIEW|FUNDING_TEXT_AWARD_MISMATCH`

Blockers:
- DUPLICATE_FUNDER_AWARD_NUMBER: DOE Genomics duplicate duplicates award number DE SC001.
- AWARD_NUMBER_MISSING: Unlinked private award lacks a funder award number.
- AWARD_FUNDER_NODE_MISSING: Unlinked private award references missing funder FUNDER-MISSING.
- PROJECT_AWARD_EDGE_MISSING_TARGET: Genomics collaboration map references missing award AWD-MISSING.
- FUNDED_PROJECT_WITHOUT_AWARD_EDGE: Funded but unlinked project is marked funded but has no award edge.
- OUTPUT_PROJECT_EDGE_MISSING_TARGET: Orphan output references missing project PROJ-MISSING.
- OUTPUT_AWARD_EDGE_MISSING_TARGET: Orphan output references missing award AWD-MISSING.
- OPEN_ACCESS_MANDATE_UNMET: Genomics collaboration dataset is linked to DOE Genomics A but is not marked open access.
- INACTIVE_AWARD_USED_IN_VISIBLE_RECOMMENDATION: Recommendation REC-BAD-1 is visible but uses inactive award AWD-DOE-1.
- RECOMMENDATION_AWARD_MISSING: Recommendation REC-BAD-2 references missing award AWD-DOES-NOT-EXIST.

Warnings:
- AWARD_URI_MISSING: Unlinked private award lacks a stable funder or grant URI.
- AWARD_MANDATES_MISSING: Unlinked private award has no open-access, data, or reporting mandate metadata.
- FUNDING_TEXT_AWARD_MISMATCH: Genomics collaboration dataset funding text does not mention linked award(s): AWD-DOE-1.
- DATA_SHARING_MANDATE_NEEDS_REVIEW: Genomics collaboration dataset is linked to a data-sharing award but data availability is restricted.

Remediation actions:
- Merge or disambiguate duplicate award number DE SC001.
- Record the canonical award number for Unlinked private award.
- Attach Unlinked private award to a canonical funder node.
- Add a stable funder award URI for Unlinked private award.
- Repair or remove the broken award edge AWD-MISSING on Genomics collaboration map.
- Connect Funded but unlinked project to the funding award node(s).
- Attach Orphan output to a valid project node.
- Satisfy or explain the open-access mandate for Genomics collaboration dataset.
- Hide recommendation REC-BAD-1 or update the award lineage.
- Remove or repair recommendation REC-BAD-2.

### KG-FUNDER-REVIEW-2
Status: REVIEW
Required decision: lineage_review
Audit digest: `KG-FUNDER-REVIEW-2:review:B=none:W=AWARD_URI_MISSING|DATA_SHARING_MANDATE_NEEDS_REVIEW|EXPIRED_AWARD_MARKED_ACTIVE|FUNDER_AFFINITY_EXPLANATION_MISSING|FUNDER_REPORTING_EXPORT_NOT_READY`

Blockers:
- None.

Warnings:
- AWARD_URI_MISSING: NIH R01NS777 lacks a stable funder or grant URI.
- EXPIRED_AWARD_MARKED_ACTIVE: NIH R01NS777 ended on 2025-01-01 but is still marked active.
- DATA_SHARING_MANDATE_NEEDS_REVIEW: Neuroimaging method comparison is linked to a data-sharing award but data availability is controlled.
- FUNDER_REPORTING_EXPORT_NOT_READY: Neuroimaging method comparison needs funder reporting export metadata.
- FUNDER_AFFINITY_EXPLANATION_MISSING: Recommendation REC-NEURO-1 uses funder affinity without an explanation.

Remediation actions:
- Add a stable funder award URI for NIH R01NS777.

### KG-FUNDER-READY-1
Status: READY
Required decision: release_graph
Audit digest: `KG-FUNDER-READY-1:ready:B=none:W=none`

Blockers:
- None.

Warnings:
- None.

Remediation actions:
- None.

## Notes
This demo uses synthetic graph data only. It makes no external grant, registry, ROR, DOI, or funder API calls.
