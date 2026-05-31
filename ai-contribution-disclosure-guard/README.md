# AI-Assisted Contribution Disclosure Guard

Self-contained reviewer slice for SCIBASE issue #15, Community & User Reputation System.

This guard checks whether AI-assisted work should affect community reputation, badges, leaderboards, or CRediT-style contribution credit. It focuses on disclosure and human verification before reputation points are awarded.

It audits:

- undisclosed AI assistance on reputation-bearing work
- generated-text signals without disclosure
- missing human verification on high-impact reviews, reruns, datasets, and credit claims
- missing artifact provenance for project contributions
- low peer-review quality before reviewer credit
- missing evidence for CRediT-style roles
- deterministic allow, reduce, hold, and remediation decisions

The module uses synthetic data only and does not call external APIs, LLMs, identity providers, payment systems, or credentialed services.

## Files

- `index.js` - disclosure and reputation-credit audit engine
- `sample-data.js` - synthetic contribution packets
- `test.js` - deterministic regression tests
- `demo.js` - generates JSON, Markdown, and SVG reviewer artifacts
- `render-video.js` - renders the required short MP4 demo
- `reports/` - generated reviewer packet

## Validation

```bash
node ai-contribution-disclosure-guard/test.js
node ai-contribution-disclosure-guard/demo.js
node ai-contribution-disclosure-guard/render-video.js
node --check ai-contribution-disclosure-guard/index.js
node --check ai-contribution-disclosure-guard/sample-data.js
node --check ai-contribution-disclosure-guard/test.js
node --check ai-contribution-disclosure-guard/demo.js
node --check ai-contribution-disclosure-guard/render-video.js
git diff --check
ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt,width,height -show_entries format=duration,size -of default=nw=1 ai-contribution-disclosure-guard/reports/demo.mp4
```
