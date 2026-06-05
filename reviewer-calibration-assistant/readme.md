# Reviewer Calibration Assistant

This module adds a deterministic reviewer calibration and inter-rater agreement assistant for the SCIBASE AI-Powered Research Assistant Suite.

## Scope

The assistant evaluates review packets before AI-generated peer-review summaries, reputation updates, or author-facing recommendations are released. It focuses on a distinct quality gate not covered by the existing broad assistant, reproducibility checker, research-gap finder, structured-abstract, model-assumption, dependency, external-validity, or evidence-binder slices.

It checks:

- pairwise reviewer agreement across clarity, rigor, novelty, reproducibility, and recommendation;
- recommendation consensus ratio;
- severe score spread by scoring dimension;
- domain-template drift;
- evidence-anchor coverage for reviewer claim checks;
- duplicate reviewer records;
- whether disputed packets should remain double-blind during calibration.

## Local Validation

```sh
npm test
npm run demo
npm run demo:video
```

The demo writes reviewer-ready evidence artifacts to `reports/`:

- `reviewer-calibration-report.json`
- `reviewer-calibration-report.md`
- `reviewer-calibration-summary.svg`
- `reviewer-calibration-demo.mp4`

## Boundaries

The implementation is dependency-free and uses synthetic data only. It does not call external AI APIs, ingest private manuscripts, access credentials, or integrate with payment systems.
