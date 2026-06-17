# Assistant Output Disclosure Guard

This self-contained AI-Powered Research Assistant Suite slice validates synthetic AI assistant outputs before they are shown to researchers, collaborators, reviewers, or public discovery feeds.

The guard is distinct from broad assistant suites, citation recency checks, model-assumption diagnostics, dependency guards, reviewer calibration, external-validity transfer, sample custody, structured abstracts, and preregistration consistency. It focuses on output release safety: what an AI assistant is about to reveal.

## What it checks

- PHI, participant IDs, email addresses, and direct identifiers
- private storage links and unpublished dataset locations
- embargoed project details in public assistant output
- double-blind reviewer identity leakage
- prompt, system, or hidden-instruction leakage
- unsupported high-impact claims in review or gap-finder prose
- missing human approval for restricted outputs
- missing de-identification, redaction, consent, or data-use evidence

## Run locally

```sh
npm test
npm run demo
swift scripts/make-demo-video.swift artifacts/assistant-disclosure-demo.mp4
```

The demo writes reviewer artifacts under `artifacts/`:

- `assistant-disclosure-results.json`
- `assistant-disclosure-report.md`
- `assistant-disclosure-summary.svg`
- `assistant-disclosure-demo.mp4`
- `demo-transcript.md`

## Boundaries

All packets are synthetic. The module does not call external AI APIs, private manuscript stores, publisher systems, patient databases, credentials, payment systems, or live repositories.
