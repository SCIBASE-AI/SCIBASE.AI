# Collaborative Alt Text Export Guard

This module is a self-contained accessibility export-readiness slice for the SCIBASE real-time collaborative research editor bounty.

It focuses on publication content accessibility, not editor control accessibility. Before a collaborative manuscript is exported, it checks whether figures and tables have current, non-private, scientifically useful alt text, long descriptions, table header metadata, and accessibility sign-off.

## What It Checks

- Missing or generic alt text for exportable figures and tables
- Alt text that only repeats the caption
- Complex visuals that need a long description or data summary
- Color-only encodings without non-color labels or patterns
- Table headers, scopes, and summaries for screen-reader navigation
- Stale alt text after collaborative edits or source-data changes
- Open blocking accessibility comments
- Alt text changes inside locked final-review sections without approval
- Leaks of private reviewer notes, local file paths, or protected data markers

## Files

- `index.js` exports the evaluator plus Markdown/SVG renderers.
- `sample-data.js` contains clean, revision-required, and hold-required synthetic packets.
- `test.js` covers the release decisions and high-risk findings.
- `demo.js` writes JSON, Markdown, and SVG reviewer artifacts under `reports/`.
- `make-demo-video.js` writes a short local `reports/demo.mp4` artifact with the three decisions.

## Local Verification

```sh
npm run check
npm test
npm run demo
npm run verify-video
```

No production credentials, private data, external APIs, or package installs are required.
