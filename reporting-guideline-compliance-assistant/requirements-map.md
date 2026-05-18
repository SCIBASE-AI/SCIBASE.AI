# Requirements Map

Target issue: https://github.com/SCIBASE-AI/SCIBASE.AI/issues/16

## Auto Peer Review Reports

Implemented by `auditResearchPackage()` in `index.js`.

- Selects an appropriate reporting guideline from `studyType`.
- Emits structured peer-review findings with status, severity, evidence text, and recommended action.
- Produces a reviewer packet summary and prioritized revision actions.

## Reproducibility Checker

Implemented by `evaluateReproducibility()` in `index.js`.

- Checks for dataset, analysis code, execution environment, and protocol evidence.
- Produces a reproducibility score and missing-artifact list.
- Feeds missing reproducibility items into the readiness gate and reviewer actions.

## Research Gap Finder

Implemented by `buildResearchGapSignals()` in `index.js`.

- Converts missing guideline evidence into reporting-gap signals.
- Converts missing artifacts into reproducibility-gap signals.
- Provides prioritized next actions that can seed the opportunity feed described in the issue.

## Deterministic Demo And Validation

- `test.js` verifies clinical-trial, systematic-review, and animal-study paths.
- `demo.js` writes `demo-output.json` and prints reviewer-ready output.
- `demo.mp4` is a short static demo artifact for bounty review.

## Safety And Scope

- Uses synthetic data only.
- No API keys, wallets, external model calls, network calls, or paid services.
- Dependency-free CommonJS module suitable for incremental integration into the existing repository.
