# Citation Context-Fit Guard

This module adds a focused guard for the AI-Assisted Research Tools MVP citation flow. It checks whether an AI-recommended citation actually supports the highlighted manuscript context before insertion.

It is intentionally separate from broad paper summarization, peer-review reports, plagiarism checks, grammar analysis, citation formatting, and similar-papers widgets. This guard only validates citation-to-context fit.

## What It Checks

- Citation intent and support level
- Domain and claim overlap with highlighted manuscript text
- Contradiction signals
- DOI metadata presence
- Recency warnings for applied support claims
- Deterministic insert or hold actions

## Demo

Run:

```bash
node citation-context-fit-guard/test.js
node citation-context-fit-guard/demo.js
node citation-context-fit-guard/render-video.js
```

Generated artifacts:

- `reports/citation-context-fit-report.json`
- `reports/citation-context-fit-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call external search providers, citation APIs, private manuscripts, credentials, or SCIBASE production services.
