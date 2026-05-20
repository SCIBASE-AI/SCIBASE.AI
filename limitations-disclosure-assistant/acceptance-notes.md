# Acceptance Notes

## Scope

Adds flags under-disclosed study limitations before research assistant review packets are finalized for issue #16.

## Non-overlap

This slice avoids broad assistant, evidence/protocol trace, statistics review, research gap, rebuttal, ethics/data checker, citation-context, reporting guideline, benchmark leakage, figure/table consistency, variable provenance, domain template, living literature, or grant-fit slices.

## Validation

```bash
node limitations-disclosure-assistant/test.js
node limitations-disclosure-assistant/demo.js
file limitations-disclosure-assistant/reports/demo.webm limitations-disclosure-assistant/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `limitations-disclosure-assistant tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
