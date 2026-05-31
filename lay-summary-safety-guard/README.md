# Layperson Summary Safety Guard

Self-contained reviewer slice for SCIBASE issue #13, AI-Assisted Research Tools.

This guard focuses on the paper summarizer's layperson explanation mode. It checks whether a generated public-facing summary is safe to share with patients, funders, collaborators, or non-specialist readers before publication or one-click export.

It audits:

- unsupported public benefit claims
- over-strong causal language
- medical or treatment-advice wording
- missing uncertainty and limitations
- unexplained jargon
- reading-level drift above the intended audience
- sentence-to-evidence overlap

The module uses synthetic data only and does not call LLMs, citation services, medical systems, external APIs, or credentialed services.

## Files

- `index.js` - lay summary audit engine and report renderers
- `sample-data.js` - unsafe and safe synthetic summary packets
- `test.js` - deterministic regression tests
- `demo.js` - generates JSON, Markdown, and SVG reviewer artifacts
- `render-video.js` - renders the required short MP4 demo
- `reports/` - generated reviewer packet

## Validation

```bash
node lay-summary-safety-guard/test.js
node lay-summary-safety-guard/demo.js
node lay-summary-safety-guard/render-video.js
node --check lay-summary-safety-guard/index.js
node --check lay-summary-safety-guard/sample-data.js
node --check lay-summary-safety-guard/test.js
node --check lay-summary-safety-guard/demo.js
node --check lay-summary-safety-guard/render-video.js
git diff --check
ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt,width,height -show_entries format=duration,size -of default=nw=1 lay-summary-safety-guard/reports/demo.mp4
```
