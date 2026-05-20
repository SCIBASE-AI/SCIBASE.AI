# Acceptance Notes

## Scope

Adds checks supplementary files for reviewer-ready completeness before submission for issue #13.

## Non-overlap

This slice avoids broad summarizers, methods reproducibility, figure/table evidence, protocol deviation, citation retraction, novelty overlap, or evidence-anchored summarizer slices.

## Validation

```bash
node supplementary-material-readiness-assistant/test.js
node supplementary-material-readiness-assistant/demo.js
file supplementary-material-readiness-assistant/reports/demo.webm supplementary-material-readiness-assistant/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `supplementary-material-readiness-assistant tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
