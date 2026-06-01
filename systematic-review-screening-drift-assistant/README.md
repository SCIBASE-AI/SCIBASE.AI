# Systematic Review Screening Drift Assistant

This self-contained module adds a deterministic AI research-assistant guard for systematic review screening packets. It is scoped to SCIBASE issue #16, the AI-Powered Research Assistant Suite, and focuses on whether screening decisions, exclusion rationales, and research-gap prompts are safe to surface to researchers.

The assistant does not call external APIs, payment systems, live review platforms, or private data stores. All fixtures are synthetic and all checks run with Node built-ins.

## What It Checks

- Locked eligibility criteria versions and complete PICO plus study-design fields.
- Dual independent review at title/abstract and full-text stages.
- Unresolved reviewer conflicts before assistant output release.
- Structured exclusion reasons from an approved taxonomy.
- Full-text retrieval evidence, locators, and content hashes.
- Duplicate-cluster canonical record selection.
- AI recommendations limited to assist-only authority with human approval gates.
- Private reviewer notes kept out of assistant context and generated gap prompts.
- Research-gap prompts backed by enough screened-study evidence and limitation signals.

## Local Validation

```sh
npm --prefix systematic-review-screening-drift-assistant run check
npm --prefix systematic-review-screening-drift-assistant test
npm --prefix systematic-review-screening-drift-assistant run demo
npm --prefix systematic-review-screening-drift-assistant run make-demo-video
npm --prefix systematic-review-screening-drift-assistant run verify-video
```

## Generated Artifacts

Running the demo writes:

- `reports/clean-screening-report.json`
- `reports/risky-screening-report.json`
- `reports/risky-screening-handoff.md`
- `reports/screening-dashboard.svg`
- `reports/demo.mp4`

The risky packet intentionally demonstrates release blockers: criteria-version drift, missing criteria fields, stale search evidence, broad AI action authority, missing human approval, missing dual review, unresolved full-text conflict, missing full-text retrieval, invalid exclusion reason, missing exclusion evidence, private note leakage, and under-evidenced gap prompts.

## Issue Fit

This is a distinct AI-powered research assistant slice. It complements the broad assistant suite, evidence binder, structured abstract checker, external-validity transfer assistant, geospatial assistant, prompt-safety guard, omics review assistants, and generic peer-review generators by focusing specifically on systematic review screening integrity and exclusion-rationale drift.
