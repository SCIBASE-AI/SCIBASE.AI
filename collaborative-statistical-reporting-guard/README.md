# Collaborative Statistical Reporting Guard

This self-contained module adds a deterministic statistics consistency gate for the real-time collaborative research editor. It is scoped to SCIBASE issue #12 and focuses on whether statistics inside a coauthored manuscript are safe to export after collaborative edits.

The guard does not call external APIs, payment systems, identity providers, live projects, or private data stores. Fixtures are synthetic and every check runs with Node built-ins.

## What It Checks

- Sample-size parity across manuscript text, tables, and figures.
- P-value wording consistency with the configured significance threshold.
- Text/table p-value drift.
- Effect-size parity across text and tables.
- Confidence-interval parity across text and tables.
- Figure statistic parity against manuscript effect sizes.
- Statistical edits inside locked sections without approval.
- Unresolved blocking statistical reviewer comments.
- Export-ready, statistical-review, and hold/remediation decisions.

## Local Validation

```sh
npm --prefix collaborative-statistical-reporting-guard run check
npm --prefix collaborative-statistical-reporting-guard test
npm --prefix collaborative-statistical-reporting-guard run demo
npm --prefix collaborative-statistical-reporting-guard run make-demo-video
npm --prefix collaborative-statistical-reporting-guard run verify-video
```

## Generated Artifacts

Running the demo writes:

- `reports/clean-statistical-reporting-report.json`
- `reports/risky-statistical-reporting-report.json`
- `reports/risky-statistical-reporting-handoff.md`
- `reports/statistical-reporting-dashboard.svg`
- `reports/demo.mp4`

The risky packet intentionally demonstrates release blockers: sample-size drift, contradictory p-value wording, table/text p-value mismatch, effect-size mismatch, confidence-interval mismatch, figure/statistic mismatch, unapproved locked-section statistical edits, and unresolved statistical-review comments.

## Issue Fit

This is a distinct collaborative editor slice. It complements the existing broad editor, operation replay, offline conflict, notebook/kernel, reference formatting, equation/figure anchors, table formula, terminology/unit consistency, accessibility, suggestion provenance, notification, private-comment export, and data-availability work by focusing specifically on statistical reporting consistency before manuscript export.
