# Collaborative LaTeX Macro Safety Guard

This module is a self-contained real-time collaborative research editor slice for SCIBASE.AI issue #12. It validates synchronized Markdown and LaTeX editor packets before live preview or named-version export.

The guard uses synthetic data only. It does not connect to live users, private manuscripts, browser sessions, credentials, or external services.

## Scope

- Detect conflicting collaborator macro definitions before broadcast.
- Block unsafe macro commands such as raw HTML helpers, external links, and image includes unless a trusted render packet is explicitly reviewed.
- Detect recursive macro expansion cycles that can hang live preview or export rendering.
- Block raw active HTML and unapproved external render resources inside Markdown/LaTeX blocks.
- Hold locked sections when unapproved or external-resource macro changes affect the render packet.
- Emit deterministic remediation actions for live preview, trusted KaTeX rendering, and named-version export gates.

## Requirement Mapping

| Issue #12 area | Implementation |
| --- | --- |
| Rich scientific formatting | Macro, equation, Markdown, and external render-resource checks |
| Real-time collaboration | Multi-user macro conflict and shared render packet validation |
| Locking/unlock modes | Locked section render holds for risky macro packets |
| Version history and autosave | Named-version export decisions and reviewer remediation packets |

## Files

- `index.js` - dependency-free evaluator plus Markdown/SVG report renderers.
- `sample-data.js` - synthetic ready, blocked, and needs-review editor packets.
- `test.js` - Node assertion coverage for guard decisions and report renderers.
- `demo.js` - writes deterministic JSON, Markdown, and SVG reviewer artifacts.
- `scripts/render-demo-video.js` - optional ffmpeg-based MP4 renderer.
- `reports/` - generated reviewer artifacts.

## Validation

```bash
npm run check
npm test
npm run demo
```

Optional video render when ffmpeg is available:

```bash
npm run demo:video
```

The included demo artifacts are deterministic and based only on the synthetic fixtures in `sample-data.js`.
