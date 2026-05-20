# LaTeX Figure Anchor Lock Guard

This focused slice adds prevents collaborative edits from breaking figure anchors during LaTeX export for issue #12.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node latex-figure-anchor-lock-guard/test.js
node latex-figure-anchor-lock-guard/demo.js
```

Generated outputs are written to `latex-figure-anchor-lock-guard/reports/`.

## Why this is distinct

This does not duplicate editor foundation, autosave recovery, discussion sidebar, review decision ledger, accessibility parity, figure/table review lane, equation cross-reference, reference formatting, or freeze-lane slices. It focuses specifically on prevents collaborative edits from breaking figure anchors during LaTeX export.
