# Study Limitations Disclosure Assistant

This focused slice adds flags under-disclosed study limitations before research assistant review packets are finalized for issue #16.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node limitations-disclosure-assistant/test.js
node limitations-disclosure-assistant/demo.js
```

Generated outputs are written to `limitations-disclosure-assistant/reports/`.

## Why this is distinct

This does not duplicate broad assistant, evidence/protocol trace, statistics review, research gap, rebuttal, ethics/data checker, citation-context, reporting guideline, benchmark leakage, figure/table consistency, variable provenance, domain template, living literature, or grant-fit slices. It focuses specifically on flags under-disclosed study limitations before research assistant review packets are finalized.
