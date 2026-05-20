# Acceptance Notes

## Scope

Adds normalizes citation styles and flags bibliography consistency issues for issue #13.

## Non-overlap

This slice avoids broad summarizers, citation retraction watch, citation context reconciliation, evidence-anchored summary, protocol deviation, novelty overlap, or methods reproducibility slices.

## Validation

```bash
node citation-style-normalization-assistant/test.js
node citation-style-normalization-assistant/demo.js
file citation-style-normalization-assistant/reports/demo.webm citation-style-normalization-assistant/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `citation-style-normalization-assistant tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
