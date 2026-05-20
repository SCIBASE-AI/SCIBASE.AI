# Living Literature Surveillance Packet

Manuscript: Graph-Aware Protein Variant Prioritization (assistant-manuscript-alpha)
Decision: blocked
Report hold: yes
Checked at: 2026-05-20T00:00:00.000Z
Audit digest: 8b8366895d74f5d173819f8900f224e515b9e08e3b56574fcf6686cef362f59a

## Claim Decisions

| Claim | Decision | Related Events |
| --- | --- | --- |
| claim-graph-boost | needs_review | lit-001, lit-004 |
| claim-small-lab | blocked | lit-002 |
| claim-benchmark | needs_review | lit-003 |

## Update Queue

| Event | Priority | Action | Claims |
| --- | --- | --- | --- |
| lit-001 | normal | consider_citation_update | claim-graph-boost |
| lit-002 | high | revise_claim_or_add_limitation | claim-small-lab |
| lit-003 | normal | review_context | none |
| lit-004 | normal | review_context | claim-graph-boost |

## Blockers

- strong_contradictory_evidence: New high-strength evidence contradicts this manuscript claim.

## Warnings

- high_value_supporting_update: New strong supporting evidence should be considered for citation updates.
- claim_review_stale: Claim has not been checked against the literature within the freshness window.
- cited_evidence_corrected: A cited evidence item has a correction that should be reviewed before relying on the claim.

## Reviewer Tasks

- Route contradicted claims to author revision before peer-review packet generation.
- Review citation updates and correction notices before finalizing the assistant report.
- Add research-gap opportunities to the assistant discovery queue.
