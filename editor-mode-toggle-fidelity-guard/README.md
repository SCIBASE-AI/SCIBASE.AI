# Editor Mode Toggle Fidelity Guard

This module is a focused real-time collaborative editor slice for issue #12. It
checks whether switching between WYSIWYG and Markdown modes loses scientific
semantics before shared edits are accepted.

The guard uses synthetic data only and has no external service dependencies.

## Checks

- Equation token loss during mode switching.
- Citation key loss or mutation.
- Notebook-cell link drift.
- Comment anchor loss.
- Tracked suggestion loss.
- Locked-section edits produced by a mode conversion.

## Local Verification

```bash
node editor-mode-toggle-fidelity-guard/test.js
node editor-mode-toggle-fidelity-guard/demo.js
```

Demo artifacts are written to `editor-mode-toggle-fidelity-guard/reports/`.

## Issue #12 Mapping

This maps to the editor's WYSIWYG toggle, Markdown/LaTeX support, notebook
integration, comments, suggestions, section locks, and collaborative edit
acceptance. It is separate from broad round-trip export, accessibility parity,
LaTeX macro safety, reference merge/formatting, equation or figure anchors,
clipboard import, find/replace, chat mention scope, and journal-style guards.
