# Causal Adjustment Review Assistant

This module is a focused AI-Powered Research Assistant Suite slice for issue #16. It reviews whether a manuscript's causal claims are supported by design, adjustment, diagnostics, and control evidence before an AI peer-review packet endorses them.

It checks:

- required baseline confounders missing from adjustment sets
- collider and post-treatment adjustment in total-effect models
- temporal ordering of exposure, covariates, and outcomes
- positivity and covariate balance diagnostics
- negative-control failures
- weak instrument validity evidence
- unreported effect modifiers
- causal wording that is too strong for the evidence

All fixtures are synthetic. The module does not use credentials, private manuscripts, patient data, external APIs, citation services, model providers, or live statistical engines.

## Run

```sh
node ai-powered-research-assistant-suite/causal-adjustment-review-assistant/test.js
node ai-powered-research-assistant-suite/causal-adjustment-review-assistant/demo.js
node ai-powered-research-assistant-suite/causal-adjustment-review-assistant/make-demo-video.js
```

The demo writes reviewer artifacts to `reports/`:

- `causal-adjustment-review.json`
- `causal-adjustment-review.md`
- `causal-adjustment-summary.svg`
- `demo.mp4`

## Bounty Fit

Issue #16 asks for AI peer-review reports that detect methodological red flags, claim/evidence alignment problems, and reproducibility risks. This slice adds a deterministic causal-inference review layer that can hold, revise, or approve causal language before the assistant presents reviewer-ready feedback.
