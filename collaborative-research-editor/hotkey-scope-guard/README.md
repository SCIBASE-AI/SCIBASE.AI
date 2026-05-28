# Hotkey Scope Guard

This module is a focused real-time collaborative research editor slice for issue #12. It validates shortcut and hotkey maps before they are released to collaborative manuscript, LaTeX, WYSIWYG, and notebook surfaces.

It checks:

- browser-reserved shortcut collisions
- workspace navigation hijacking
- notebook execution outside notebook focus
- mutation shortcuts inside locked sections
- anonymous reviewer identity leakage from shortcut side effects
- unscoped formatting commands across Markdown/LaTeX/WYSIWYG/notebook modes
- screen-reader and assistive-technology shortcut collisions
- missing focus guards
- shared-state changes without audit events
- shortcut permission bypasses

All fixtures are synthetic. The module does not use credentials, live users, private manuscripts, external services, payment systems, or browser automation.

## Run

```sh
node collaborative-research-editor/hotkey-scope-guard/test.js
node collaborative-research-editor/hotkey-scope-guard/demo.js
node collaborative-research-editor/hotkey-scope-guard/make-demo-video.js
```

The demo writes reviewer artifacts to `reports/`:

- `hotkey-scope-audit.json`
- `hotkey-scope-audit.md`
- `hotkey-scope-summary.svg`
- `demo.mp4`

## Bounty Fit

Issue #12 calls for a real-time research editor with Markdown, LaTeX, WYSIWYG, Jupyter cells, comments, suggestions, locking, collaboration, and task workflows. This guard ensures keyboard-driven actions respect editor mode, focus, role permissions, locked sections, notebook execution boundaries, and anonymous review privacy before shared state changes.
