# Equation Cross-Reference Integrity Guard

This focused slice adds validates equation labels, references, and numbering in collaborative manuscripts for issue #12.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node equation-cross-reference-integrity-guard/test.js
node equation-cross-reference-integrity-guard/demo.js
```

Generated outputs are written to `equation-cross-reference-integrity-guard/reports/`.

## Why this is distinct

This does not duplicate editor foundation, autosave recovery, discussion sidebar, review decision ledger, accessibility parity, figure/table review lane, reference formatting, or freeze-lane slices. It focuses specifically on validates equation labels, references, and numbering in collaborative manuscripts.
