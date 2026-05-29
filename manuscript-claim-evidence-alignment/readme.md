# Manuscript Claim/Evidence Alignment

This module adds a focused AI research assistant guard for checking manuscript claims against cited evidence before release or internal review.

It is intentionally separate from broad peer review, reproducibility execution, literature gap discovery, citation recommendation, and general writing assistance. The module answers one concrete question: does each claim have the evidence signals it needs?

## What It Checks

- Linked evidence references for each manuscript claim
- Required support signals such as p-values, sample size, control groups, safety monitoring windows, and novelty scope limitations
- Overclaims where wording is stronger than the evidence summary
- Weakly supported claims that should be softened or backed by additional evidence
- Release-blocking missing evidence cases

## Demo

Run:

```bash
node manuscript-claim-evidence-alignment/test.js
node manuscript-claim-evidence-alignment/demo.js
node manuscript-claim-evidence-alignment/render-video.js
```

Generated artifacts:

- `reports/claim-evidence-report.json`
- `reports/claim-evidence-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call external AI models, manuscript services, publisher APIs, notebooks, private documents, credentials, or live SCIBASE accounts.
