# Acceptance Notes

## Review Scenarios

1. Ready executive summary
   - Objective, methods, and results claims are present.
   - Every claim points to a known evidence anchor.
   - The result is ready with ranked bullets and a stable digest.

2. Layperson summary
   - Technical terms such as p-values, regression, and confidence intervals are translated into plainer language.
   - Evidence anchors remain attached to the output bullets.

3. Blocked summary
   - Unanchored claims and missing evidence IDs block readiness.
   - Missing required sections are surfaced as warnings.

## Validation

```bash
node evidence-anchored-summarizer/test.js
node evidence-anchored-summarizer/demo.js
node --check evidence-anchored-summarizer/index.js
node --check evidence-anchored-summarizer/test.js
node --check evidence-anchored-summarizer/demo.js
```

The included `demo.mp4` is a five-second visual walkthrough of the evidence-anchored summary flow.
