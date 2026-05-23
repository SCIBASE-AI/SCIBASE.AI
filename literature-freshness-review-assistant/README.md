# Literature Freshness Review Assistant

This is a focused AI-Powered Research Assistant Suite slice for SCIBASE issue #16. It checks whether reviewer-facing manuscript claims rely on current evidence before the assistant marks a packet ready.

## Scope

- Flags stale support citations outside a configurable freshness window.
- Detects newer systematic reviews, reporting guidelines, dataset releases, and benchmark updates that are missing from a claim.
- Escalates newer contradictory evidence as a review hold.
- Detects dataset and benchmark version drift for claims using "current" or "state-of-the-art" wording.
- Emits reviewer actions, research-gap prompts, stable audit digests, and deterministic JSON/Markdown/SVG/MP4 artifacts.

This is intentionally separate from broad assistant suites, citation-context reconciliation, retraction notices, statistics review, benchmark-leakage checks, reporting-guideline compliance, figure/table checks, prompt-safety guards, and assay control/calibration completeness.

## Files

- `index.js` - freshness evaluator and report renderers
- `sample-data.js` - synthetic evidence ledger and manuscript packets
- `test.js` - dependency-free assertion tests
- `demo.js` - deterministic JSON/Markdown/SVG report generator
- `scripts/render-demo-video.js` - optional ffmpeg MP4 renderer
- `reports/` - generated reviewer artifacts

## Validate

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

Synthetic data only. The module does not call external APIs, scan private manuscripts, use credentials, or contact payment services.
