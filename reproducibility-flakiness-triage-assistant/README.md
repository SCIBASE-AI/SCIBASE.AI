# Reproducibility Flakiness Triage Assistant

This module adds a focused reproducibility flakiness triage assistant for the AI-Powered Research Assistant Suite bounty in issue #16. It localizes why repeated project runs disagree before a reviewer, journal, funder, or lab relies on the reported reproducibility score.

The scope is distinct from broad assistant suites, protocol or evidence trace modules, statistics review, research-gap planners, rebuttal packs, ethics/data checks, citation-context reconciliation, reporting-guideline checks, benchmark leakage, figure/table consistency, analysis-variable provenance, domain template selection, living literature surveillance, grant-fit, and limitations disclosure assistants.

## What It Checks

- Repeated run packet integrity through deterministic run roots.
- At least two independent runs before confidence scoring.
- Exit-code failures before output comparison.
- Output artifact hash drift across repeated runs.
- Environment and dataset hash drift.
- Unseeded randomness, wall-clock reads, network dependencies, and unpinned dependencies.
- Prior independent reproducibility attempts that passed or failed.
- Reviewer-ready likely-cause classification and author action packets.

## Run The Demo

From the repository root:

```bash
node reproducibility-flakiness-triage-assistant/test.js
node reproducibility-flakiness-triage-assistant/demo.js
```

The demo writes JSON, Markdown, and SVG reviewer artifacts under `reproducibility-flakiness-triage-assistant/reports/`. This submission also includes `reports/demo.mp4` rendered from the generated review summary.
