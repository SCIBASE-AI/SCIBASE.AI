# Living Literature Surveillance Assistant

This module adds a focused living-literature monitoring slice for the AI-Powered Research Assistant Suite in issue #16. It compares manuscript claims against newly observed papers, corrections, retractions, and replication attempts, then produces reviewer-ready update tasks before an AI assistant report is released.

The scope is distinct from broad assistant suites, protocol trace, evidence grounding, statistics review, research-gap planners, rebuttal packs, ethics/data checks, citation-context reconciliation, reporting-guideline checks, benchmark leakage audits, figure/table consistency checks, analysis-variable provenance, and domain-template selectors.

## What It Checks

- Claim freshness against a configured review window.
- New high-strength supporting evidence that may need citation updates.
- Retractions or corrections affecting cited evidence.
- High-strength contradictory or failed-replication evidence.
- Replication updates with missing reusable artifacts.
- Negative or null-result signals that should become research-gap opportunities.

## Decisions

The evaluator returns:

- `approved`: no living-literature action is needed.
- `needs_review`: citation updates, corrections, stale claims, or artifact gaps need review.
- `blocked`: release should pause because evidence is retracted or strongly contradicted.

## Run The Demo

From the repository root:

```bash
node living-literature-surveillance-assistant/test.js
node living-literature-surveillance-assistant/demo.js
```

The demo writes:

- `reports/literature-surveillance-report.json`
- `reports/literature-review-packet.md`
- `reports/literature-surveillance.svg`

This submission also includes `reports/demo.mp4` as a short visual preview of the generated surveillance packet.
