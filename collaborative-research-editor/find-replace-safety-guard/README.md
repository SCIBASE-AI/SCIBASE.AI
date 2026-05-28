# Collaborative Find/Replace Safety Guard

Focused slice for SCIBASE issue #12: a real-time collaborative editor guard that previews global find/replace operations before they mutate shared manuscript state.

## What it checks

- Protected section locks and final-review freeze state.
- Citation keys, cross-reference anchors, and LaTeX command names.
- Notebook/code cells where semantic replacements need explicit review.
- Inline comment quote anchors that would no longer resolve after replacement.
- WYSIWYG/source-mode replacement scope so batch edits remain reviewable.

The module is deterministic and dependency-free. It uses synthetic document packets only; it does not connect to live editors, private projects, external services, or credentials.

## Validation

```bash
node collaborative-research-editor/find-replace-safety-guard/test.js
node collaborative-research-editor/find-replace-safety-guard/demo.js
node collaborative-research-editor/find-replace-safety-guard/make-demo-video.js
```
