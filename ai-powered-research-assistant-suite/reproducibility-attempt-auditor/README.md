# Reproducibility Attempt Auditor

This module is a focused AI-Powered Research Assistant Suite slice for issue #16. It audits whether a manuscript's reproducibility evidence is strong enough before the assistant presents a public confidence score.

It checks:

- raw dataset and reviewer test-set availability
- dataset and output artifact digest consistency
- dependency lock drift and unpinned packages
- pipeline-stage input and environment coverage
- reported manuscript result mismatches
- repeated-run variance and missing random seeds
- unresolved prior reproducibility failures

All fixtures are synthetic. The code does not use credentials, private manuscripts, external APIs, package registries, notebooks, containers, or live execution sandboxes.

## Run

```sh
node ai-powered-research-assistant-suite/reproducibility-attempt-auditor/test.js
node ai-powered-research-assistant-suite/reproducibility-attempt-auditor/demo.js
node ai-powered-research-assistant-suite/reproducibility-attempt-auditor/make-demo-video.js
```

The demo writes reviewer artifacts to `reports/`:

- `reproducibility-attempt-audit.json`
- `reproducibility-attempt-audit.md`
- `reproducibility-attempt-summary.svg`
- `demo.mp4`

## Bounty Fit

Issue #16 asks for a reproducibility checker that verifies output consistency, dependency and version integrity, raw data, clean pipelines, test sets, discrepancies, non-determinism, confidence scoring, and links to prior attempts. This slice implements that decision layer deterministically so a future assistant can hold, route, or approve reproducibility claims before presenting them to researchers.
