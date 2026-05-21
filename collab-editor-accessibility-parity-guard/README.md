# Collaborative Editor Accessibility Parity Guard

This module adds a focused accessibility and input-mode parity gate for issue #12, the real-time collaborative research editor.

It checks whether collaborative editor surfaces are usable across Markdown and WYSIWYG modes before a manuscript is released to reviewers or coauthors.

## What It Checks

- keyboard reachability for toolbars, comments, suggestions, locks, and notebook cells
- screen-reader labels for interactive controls
- spoken text for LaTeX equation blocks
- alt text for visual notebook outputs
- anchors for comments and suggestions
- screen-reader announcements for section lock state changes
- focus order coverage and unknown focus targets
- Markdown/WYSIWYG availability parity for shared controls

## Run

```bash
node collab-editor-accessibility-parity-guard/test.js
node collab-editor-accessibility-parity-guard/demo.js
```

The demo writes:

- `reports/accessibility-parity-packet.json`
- `reports/accessibility-parity-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

Synthetic data only. No credentials, external APIs, or browser automation are required.
