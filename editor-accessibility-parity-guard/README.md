# Editor Accessibility Parity Guard

This module adds a focused WYSIWYG and accessibility parity guard for the real-time collaborative research editor described in issue #12. It checks whether scientific editor blocks are ready for both technical authors and non-technical collaborators before publication review.

The guard is intentionally distinct from broad editor, notebook collaboration, reference formatting, offline conflict, autosave recovery, freeze lane, discussion sidebar, round-trip fidelity, and review-decision submissions.

## What It Checks

- Equation LaTeX source, fallback text, and stable labels.
- Figure and table captions, alt text, and cross-reference anchors.
- Code block language, captions, and output captions.
- Notebook kernel metadata, output freshness, and accessible output summaries.
- Citation WYSIWYG preview readiness.
- Keyboard labels for block-level navigation.
- Heading order for screen-reader navigation.
- Plain-language WYSIWYG previews for non-text scientific blocks.

## Decisions

The evaluator returns:

- `approved`: no blockers or warnings.
- `needs_review`: warnings exist but no release-blocking accessibility gaps.
- `blocked`: publication/release should pause until accessibility blockers are resolved.

## Run The Demo

From the repository root:

```bash
node editor-accessibility-parity-guard/test.js
node editor-accessibility-parity-guard/demo.js
```

The demo writes:

- `reports/accessibility-parity-report.json`
- `reports/accessibility-review-packet.md`
- `reports/accessibility-parity.svg`

This submission also includes `reports/demo.mp4` as a short visual preview of the generated review packet.
