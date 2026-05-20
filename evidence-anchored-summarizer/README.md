# Evidence-Anchored Summarizer

This module covers the AI paper summarizer portion of SCIBASE issue #13.

It turns claim/evidence inputs into abstract, executive, or layperson summaries while refusing to mark a summary ready if claims are not anchored to known evidence. This keeps AI-generated summaries useful without hiding provenance gaps.

## What It Does

- Supports `abstract`, `executive`, and `layperson` summary modes.
- Ranks objective, methods, results, findings, and limitations by evidence support.
- Keeps evidence IDs attached to every output bullet.
- Blocks summaries with missing or unanchored evidence.
- Emits implications, next steps, and a deterministic evidence digest.

## Run

```bash
node evidence-anchored-summarizer/test.js
node evidence-anchored-summarizer/demo.js
```
