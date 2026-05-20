# Challenge Evidence Freeze Review: Single-cell biomarker forecast challenge

Decision: **hold-evaluation-and-payout**
Blockers: **4**
Total diffs: **6**

## Tamper Diff Queue
- [blocker] model: model checksum changed from sha256:model-v1 to sha256:model-v2.
  Task: Freeze evaluation for this artifact and route to arbitration before scoring.
  Justification: retrained after discovering seed typo
- [blocker] model: model metric heldout_auc changed from 0.842 to 0.861.
  Task: Require reviewer-visible metric-change explanation and pre-deadline reproduction evidence.
  Justification: retrained after discovering seed typo
- [blocker] whitepaper: whitepaper metric page_count changed from 12 to 13.
  Task: Require reviewer-visible metric-change explanation and pre-deadline reproduction evidence.
  Justification: added funding acknowledgement only
- [medium] whitepaper: whitepaper size changed while checksum stayed fixed.
  Task: Verify packaging metadata and storage manifest generation.
  Justification: added funding acknowledgement only
- [blocker] supplement: supplement was added after the frozen deadline manifest.
  Task: Exclude this artifact from scoring and hold payout/arbitration until reviewed.
- [high] supplement: supplement has no reviewer-visible late-addition justification.
  Task: Require a public exception note before sponsor review.

## Arbitration Packet
- Frozen manifest: sha256:frozen-manifest-001
- Current manifest: sha256:current-manifest-002
- Excluded from scoring: model, whitepaper, supplement

Audit digest: `f9aacb2b51e4f942d760548b7e4ebcd13705da0243151e2a223c56e2d8333901`
