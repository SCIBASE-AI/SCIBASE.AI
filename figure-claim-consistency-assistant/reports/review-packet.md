# Figure Claim Consistency Review: Adaptive Imaging Biomarkers for Early Neuroinflammation

Decision: **block-release**
Average score: **25**
Total issues: **19**

## Highest Risk Claims
- C2: major-revision (0)
- C3: major-revision (0)
- C4: block-release (0)

## Reviewer Tasks

### C1
Score: 100
Status: ready-with-notes
- No blocking figure/table inconsistencies found.

### C2
Score: 0
Status: major-revision
- [high] fig-2A shows decrease, but claim C2 says stable.
  Task: Revise the claim language or regenerate the panel from the intended analysis.
- [medium] fig-2A effect -0.06 does not match reported claim effect 0.01.
  Task: Update the manuscript effect size or regenerate the plotted estimate.
- [medium] fig-2A uses n=47; claim C2 reports n=64.
  Task: Add a sample-size reconciliation note and align the figure/table/manuscript counts.
- [medium] fig-2A caveat "exploratory subgroup" is absent from claim C2.
  Task: Carry the figure caveat into the manuscript claim or downgrade the conclusion.
- [low] fig-2A uses an unsafe color encoding for review.
  Task: Switch to a redundant encoding or color-safe palette before submission.
- [medium] table-2 row effect -0.06 does not match claim effect 0.01.
  Task: Reconcile the table value and manuscript claim.
- [medium] table-2 row uses n=47; claim C2 reports n=64.
  Task: Align table and manuscript denominators.
- [medium] table-2 row for claim C2 lacks multiplicity-adjusted significance evidence.
  Task: Add adjusted p-values or downgrade the subgroup conclusion.
- [high] Claim C2 requires public subgroup-manifest, but none is attached.
  Task: Attach a public subgroup-manifest artifact before submission.

### C3
Score: 0
Status: major-revision
- [high] fig-3 uses seconds while claim C3 reports minutes.
  Task: Normalize units in the caption, manuscript claim, and source table.
- [high] fig-3A shows above-threshold, but claim C3 says below-threshold.
  Task: Revise the claim language or regenerate the panel from the intended analysis.
- [medium] fig-3A effect 7.8 does not match reported claim effect 5.
  Task: Update the manuscript effect size or regenerate the plotted estimate.
- [medium] fig-3A caveat "GPU queue warm cache" is absent from claim C3.
  Task: Carry the figure caveat into the manuscript claim or downgrade the conclusion.
- [high] fig-3A has no linked analysis notebook.
  Task: Attach the notebook that produces this figure and rerun the assistant.
- [medium] table-3 row effect 7.8 does not match claim effect 5.
  Task: Reconcile the table value and manuscript claim.

### C4
Score: 0
Status: block-release
- [blocker] Claim C4 cites a figure that is not present in the packet.
  Task: Attach the referenced figure or remove the unsupported claim before submission.
- [high] Claim C4 cites a table that is not present in the packet.
  Task: Attach the referenced table or remove the table citation.
- [high] Claim C4 requires public deployment-protocol, but none is attached.
  Task: Attach a public deployment-protocol artifact before submission.
- [high] Claim C4 requires public monitoring-plan, but none is attached.
  Task: Attach a public monitoring-plan artifact before submission.

## Research Gap Signals
- C2 (high): Run a targeted follow-up study for C2 before broadening the conclusion.
- C3 (high): Run a targeted follow-up study for C3 before broadening the conclusion.
- C4 (high): Run a targeted follow-up study for C4 before broadening the conclusion.

Audit digest: `c41b98366bd40d07468f7fc416e0ccd099a84730651cb750d5acc4b15b1715ff`
