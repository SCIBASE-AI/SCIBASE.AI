# Collaborative Equation Anchor Guard

Self-contained reviewer artifact for the real-time collaborative research
editor bounty.

This module checks whether equation labels and references remain stable while
multiple collaborators edit Markdown, LaTeX, and WYSIWYG sections. It focuses
on equation anchors, not broad editor operation replay, notebook execution,
footnotes, chat mentions, suggestion provenance, or mode-toggle fidelity.

## Scope

- Detect duplicate equation labels, stale `\\ref{...}` anchors, numbering drift,
  locked-section mutations, and private reviewer equation comments that would
  leak into export.
- Produce deterministic allow/hold/remediation decisions for manuscript export.
- Use synthetic data only. No private manuscripts, credentials, browser storage,
  identity-provider calls, or external APIs.

## Commands

```bash
node collaborative-equation-anchor-guard/test.js
node collaborative-equation-anchor-guard/demo.js
node collaborative-equation-anchor-guard/render-video.js
node --check collaborative-equation-anchor-guard/index.js
node --check collaborative-equation-anchor-guard/sample-data.js
node --check collaborative-equation-anchor-guard/test.js
node --check collaborative-equation-anchor-guard/demo.js
node --check collaborative-equation-anchor-guard/render-video.js
```

The demo writes JSON, Markdown, SVG, and MP4 reviewer artifacts under
`collaborative-equation-anchor-guard/reports/`.
