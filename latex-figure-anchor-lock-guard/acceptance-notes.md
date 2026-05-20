# Acceptance Notes

## Scope

Adds prevents collaborative edits from breaking figure anchors during LaTeX export for issue #12.

## Non-overlap

This slice avoids editor foundation, autosave recovery, discussion sidebar, review decision ledger, accessibility parity, figure/table review lane, equation cross-reference, reference formatting, or freeze-lane slices.

## Validation

```bash
node latex-figure-anchor-lock-guard/test.js
node latex-figure-anchor-lock-guard/demo.js
file latex-figure-anchor-lock-guard/reports/demo.webm latex-figure-anchor-lock-guard/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `latex-figure-anchor-lock-guard tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
