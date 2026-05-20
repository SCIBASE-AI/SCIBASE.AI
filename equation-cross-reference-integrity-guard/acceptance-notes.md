# Acceptance Notes

## Scope

Adds validates equation labels, references, and numbering in collaborative manuscripts for issue #12.

## Non-overlap

This slice avoids editor foundation, autosave recovery, discussion sidebar, review decision ledger, accessibility parity, figure/table review lane, reference formatting, or freeze-lane slices.

## Validation

```bash
node equation-cross-reference-integrity-guard/test.js
node equation-cross-reference-integrity-guard/demo.js
file equation-cross-reference-integrity-guard/reports/demo.webm equation-cross-reference-integrity-guard/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `equation-cross-reference-integrity-guard tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
