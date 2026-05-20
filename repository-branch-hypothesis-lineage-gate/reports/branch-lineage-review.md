# Repository Branch Hypothesis Lineage Review

Repository: scibase-neurotoxicity-screen
Current version: 1.4.2

## Summary

- Ready: 1
- Hold: 0
- Block: 1
- Highest risk score: 202

## Branch Packets

### experiment/astrocyte-normalization

- Decision: ready
- Risk score: 0
- Version impact: minor
- Hypothesis: HYP-042
- Protocol snapshot: pro-17@sha256:9b7a

Findings:
- none

Citation notes:
- Recommend minor version impact from 1.4.2.
- Regenerate schema.org and BibTeX metadata before export.

### experiment/low-signal-staining

- Decision: block
- Risk score: 202
- Version impact: major
- Hypothesis: HYP-055
- Protocol snapshot: pro-22@draft

Findings:
- blocker: hypothesis-not-approved - Hypothesis HYP-055 is draft.
- warning: hypothesis-component-gap - Expected component types not changed: notebook.
- blocker: protocol-not-frozen - Protocol PRO-22 is not frozen.
- warning: protocol-unapproved - Protocol PRO-22 has no approvers.
- blocker: missing-component-hash - protocols/low-signal-staining.md needs a sha256 content hash.
- blocker: large-file-not-lfs - results/low-signal-output.zip is large but not routed through LFS.
- blocker: result-input-missing - results/low-signal-output.zip references missing inputs: notebooks/missing-low-signal.ipynb.
- blocker: no-passing-repro-run - Changed result artifacts need a passing reproducibility run.
- info: external-fork-attribution - Branch derives from external-lab/fork at commit:aa2001; preserve this in merge notes.

Citation notes:
- Recommend major version impact from 1.4.2.
- Refresh author/contributor citation metadata before tagging.
- Review DOI target continuity for 10.5555/scibase.neurotoxicity.2026.

