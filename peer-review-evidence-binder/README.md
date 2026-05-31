# AI Peer Review Evidence Binder

Self-contained guard for SCIBASE issue #16, AI-Powered Research Assistant Suite.

The module validates AI-generated peer-review comments before they are shown to authors. It focuses on the review-output layer: evidence pointers, severity calibration, unsupported accusations, blinded-review privacy, actionable remediation, and deterministic audit evidence.

## What It Checks

- Every AI review finding cites concrete manuscript or artifact evidence.
- Blocking or severe comments have enough evidence strength to justify their severity.
- Unsupported accusations and hallucinated review findings are held before release.
- Blinded-review identity details and private reviewer notes do not leak into author-visible comments.
- Review comments contain actionable remediation tasks instead of vague criticism.
- Reviewer-ready JSON, Markdown, SVG, and MP4 artifacts can be regenerated locally.

## Files

- `index.js` - evaluation engine and report formatters
- `sample-data.js` - synthetic AI review packets
- `test.js` - dependency-free tests using Node's built-in `assert`
- `demo.js` - generates reviewer JSON, Markdown, and SVG reports
- `render-video.js` - renders a short MP4 with `ffmpeg`, or an animated GIF fallback with ImageMagick
- `reports/demo.mp4` - reviewer demo artifact

## Validation

```bash
node peer-review-evidence-binder/test.js
node peer-review-evidence-binder/demo.js
node peer-review-evidence-binder/render-video.js
node --check peer-review-evidence-binder/index.js
node --check peer-review-evidence-binder/sample-data.js
node --check peer-review-evidence-binder/test.js
node --check peer-review-evidence-binder/demo.js
node --check peer-review-evidence-binder/render-video.js
```
