# Citation Style Normalization Assistant

This focused slice adds normalizes citation styles and flags bibliography consistency issues for issue #13.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node citation-style-normalization-assistant/test.js
node citation-style-normalization-assistant/demo.js
```

Generated outputs are written to `citation-style-normalization-assistant/reports/`.

## Why this is distinct

This does not duplicate broad summarizers, citation retraction watch, citation context reconciliation, evidence-anchored summary, protocol deviation, novelty overlap, or methods reproducibility slices. It focuses specifically on normalizes citation styles and flags bibliography consistency issues.
