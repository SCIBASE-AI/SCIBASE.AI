# Supplementary Material Readiness Assistant

This focused slice adds checks supplementary files for reviewer-ready completeness before submission for issue #13.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node supplementary-material-readiness-assistant/test.js
node supplementary-material-readiness-assistant/demo.js
```

Generated outputs are written to `supplementary-material-readiness-assistant/reports/`.

## Why this is distinct

This does not duplicate broad summarizers, methods reproducibility, figure/table evidence, protocol deviation, citation retraction, novelty overlap, or evidence-anchored summarizer slices. It focuses specifically on checks supplementary files for reviewer-ready completeness before submission.
