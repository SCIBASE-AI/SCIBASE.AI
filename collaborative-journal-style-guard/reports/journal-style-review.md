# Collaborative Journal Style Conformance Review

Generated: 2026-05-28T00:00:00.000Z

## Summary

- Manuscripts reviewed: 4
- Export ready: 1
- Minor style fixes: 1
- Style revision: 1
- Blocked: 1
- Average style score: 56

## Requirement Map

- Rich scientific formatting: validates journal-specific sections, declarations, references, figures, and tables.
- Reference manager integration: checks target reference style before export.
- Real-time collaboration: blocks export while comments, tracked changes, suggestions, or approvals are unresolved.
- Jupyter integration: blocks stale notebook-derived outputs before publication export.
- Publication templates: applies target journal abstract, word-count, figure, and table limits.

## Findings

### Collaborative neural organoid protocol validation

- Target journal: Journal of Collaborative Neuroscience Methods
- Decision: export-ready
- Style score: 100
- Finding count: 0

Actions:
- Generate journal export packet from the current collaborative manuscript hash.

### Methods manuscript with misplaced data statement

- Target journal: Journal of Collaborative Neuroscience Methods
- Decision: block-export
- Style score: 0
- Finding count: 12
- critical: section-order-drift - Manuscript sections do not match the target journal order.
- medium: abstract-word-limit-exceeded - Abstract exceeds the target journal word limit.
- high: manuscript-word-limit-exceeded - Main manuscript exceeds the target journal word limit.
- high: figure-limit-exceeded - Figure count exceeds the target journal limit.
- high: reference-style-mismatch - Reference style does not match the target journal instructions.
- critical: missing-required-declaration - Required publication declaration is missing.
- critical: missing-required-declaration - Required publication declaration is missing.
- critical: blocking-comments-open - Blocking collaborative comments remain unresolved.
- high: tracked-changes-open - Tracked changes remain unresolved in shared manuscript blocks.
- medium: many-unresolved-suggestions - Many non-blocking suggestions remain open.
- high: stale-notebook-output - Notebook-derived manuscript outputs are stale relative to source cells.
- critical: missing-coauthor-approval - Not all required coauthors have approved the current manuscript hash.

Actions:
- Reorder manuscript blocks and restore missing required sections before export.
- Shorten abstract or move details into the main manuscript.
- Trim manuscript text or request an editor-approved exception.
- Move lower-priority figures to supplements or request an exception.
- Regenerate references using the target journal style.
- Add and coauthor-review the ethics declaration block before export.
- Add and coauthor-review the data-availability declaration block before export.
- Resolve blocking comments before generating a submission export.
- Accept, reject, or explicitly defer tracked changes before export.
- Triage open suggestions or mark them as intentionally deferred.
- Re-run or refresh notebook outputs before final export.
- Collect coauthor approvals after final style and content changes are applied.

### Bioengineering model with style revision gaps

- Target journal: Open Bioengineering Reports
- Decision: style-revision
- Style score: 30
- Finding count: 6
- high: manuscript-word-limit-exceeded - Main manuscript exceeds the target journal word limit.
- high: figure-limit-exceeded - Figure count exceeds the target journal limit.
- high: missing-required-declaration - Required publication declaration is missing.
- high: tracked-changes-open - Tracked changes remain unresolved in shared manuscript blocks.
- medium: many-unresolved-suggestions - Many non-blocking suggestions remain open.
- high: stale-notebook-output - Notebook-derived manuscript outputs are stale relative to source cells.

Actions:
- Trim manuscript text or request an editor-approved exception.
- Move lower-priority figures to supplements or request an exception.
- Add and coauthor-review the author-contributions declaration block before export.
- Accept, reject, or explicitly defer tracked changes before export.
- Triage open suggestions or mark them as intentionally deferred.
- Re-run or refresh notebook outputs before final export.

### Short collaborative methods note

- Target journal: Open Bioengineering Reports
- Decision: minor-style-fixes
- Style score: 95
- Finding count: 1
- medium: abstract-word-limit-exceeded - Abstract exceeds the target journal word limit.

Actions:
- Shorten abstract or move details into the main manuscript.
