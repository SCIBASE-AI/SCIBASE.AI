# Assistant Decision Handoff Guard Report

Generated: 2026-05-31T00:00:00.000Z
Audit digest: 57569e4993e08c385bc9dcf05b6bf58625f7449b8d7cda2d519acfa3a7e4366a

## Summary

- Handoff packets: 5
- Release: 1
- Revise: 1
- Hold: 3
- Blockers: 9
- Warnings: 1
- Max snapshot age days: 50

## Decisions

### handoff:peer-review-methods-clarity

- Assistant: auto-peer-review
- Output type: peer_review_comment
- Decision: release
- Target: manuscript.md @ ms-v12
- Snapshot revision: ms-v12
- Snapshot age days: 1
- Confidence: 0.82
- Blockers: none
- Warnings: none
- Actions: release handoff to researcher-facing queue
- Digest: 421868aaa57b79f52841dbf0504c34e679406471ab77d6dd856799548199bb36

### handoff:reproducibility-badge-release

- Assistant: reproducibility-checker
- Output type: reproducibility_release
- Decision: hold
- Target: analysis/notebook.ipynb @ analysis-v8
- Snapshot revision: analysis-v8
- Snapshot age days: 0
- Confidence: 0.91
- Blockers: missing evidence anchors: environment-lock; notebook-runner reported block: cell 18 remains nondeterministic; human approval is pending
- Warnings: none
- Actions: attach required evidence anchors before release; resolve cross-assistant conflict before user-facing handoff; obtain responsible human approval for high-impact handoff
- Digest: 574cb0e6776fee74eff6f72e05cfc152078a2b5ed932214200125423b8cc75ef

### handoff:gap-opportunity-corpus-drift

- Assistant: research-gap-finder
- Output type: research_gap_opportunity
- Decision: hold
- Target: gap-feed.json @ corpus-2026-05
- Snapshot revision: corpus-2026-04
- Snapshot age days: 50
- Confidence: 0.76
- Blockers: artifact revision drift: assistant used corpus-2026-04, current target is corpus-2026-05; snapshot is 50 days old, above 30 day limit; missing evidence anchors: novelty-check
- Warnings: none
- Actions: refresh assistant context against the current artifact revision; refresh source snapshot before handoff; attach required evidence anchors before release
- Digest: ef7b59e2be719c3f573cf059171dfbcf8d4496c521f75ef3f7363d2e844166ac

### handoff:gap-opportunity-low-confidence

- Assistant: research-gap-finder
- Output type: research_gap_opportunity
- Decision: revise
- Target: gap-feed.json @ corpus-2026-05
- Snapshot revision: corpus-2026-05
- Snapshot age days: 6
- Confidence: 0.64
- Blockers: none
- Warnings: assistant confidence 0.64 needs strengthening
- Actions: keep the output in draft until more support is attached; revise handoff before promotion
- Digest: e8b49c282d105781c1287a607ecb7bda0a84245d219fe67567ef562637e91850

### handoff:peer-review-private-note

- Assistant: auto-peer-review
- Output type: peer_review_comment
- Decision: hold
- Target: manuscript.md @ ms-v12
- Snapshot revision: ms-v12
- Snapshot age days: 0
- Confidence: 0.88
- Blockers: review-redaction reported block: private reviewer rationale was copied; private reviewer notes are present; reviewer identity leakage risk detected
- Warnings: none
- Actions: resolve cross-assistant conflict before user-facing handoff; redact private reviewer notes before author-visible release; remove identity-bearing details from the handoff
- Digest: c5ad64bf782f11ceae2da3bb73bea57bb753df660acdea82b341d4b2ae2d15d9
