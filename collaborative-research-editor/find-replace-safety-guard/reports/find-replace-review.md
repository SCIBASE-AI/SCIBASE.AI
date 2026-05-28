# Collaborative Find/Replace Safety Review

Decision: hold-batch-edit
Risk score: 100
Changed blocks: 5
Audit digest: 855bf874ddecf9aa

## Findings
- [high] Replacement would alter LaTeX command or equation source: methods/methods-eq1 is a LaTeX block with 2 match(es).
  Action: Preview equation output and require formula-owner approval before applying source-mode replacements.
- [high] Replacement would mutate notebook or code cell source: methods/methods-code1 is notebook source with 1 match(es).
  Action: Create a code-review task and rerun the notebook before sharing updated outputs.
- [high] Replacement would alter citation keys or reference anchors: references/ref-key contains citation/reference text matching "alpha".
  Action: Route citation-key changes through the reference manager merge workflow instead of direct replacement.
- [blocker] Batch replacement touches a locked or final-review section: final-figures/fig1-caption has 2 match(es) while section state is locked.
  Action: Exclude the section, unlock with an audit reason, or convert matches to explicit suggestions.
- [medium] Replacement touches cross-reference anchors: final-figures/fig1-caption contains figure, table, or equation anchors.
  Action: Regenerate cross-reference maps and hold export until anchors resolve.
- [medium] Replacement would invalidate an inline comment quote anchor: Comment cmt-17 anchors to text that would be replaced in block methods-p1.
  Action: Convert the edit to a suggestion and re-anchor or resolve the comment before applying.
- [medium] WYSIWYG replacement crosses source-only content: The operation starts in WYSIWYG mode but reaches LaTeX, citation, or code source blocks.
  Action: Split the operation by block type so source-mode changes receive explicit review.

## Safety
- Synthetic document packet only; no live editor or private manuscript data.
