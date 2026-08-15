# External Validity Transfer Assistant

This module is a focused slice for SCIBASE issue #16, AI-Powered Research Assistant Suite.

It adds a deterministic research-assistant review gate for external validity and population-transfer risk before AI-generated peer-review packets are shown to authors, reviewers, funders, or lab leads.

## What It Checks

- Whether broad manuscript claims are backed by evidence from the asserted populations.
- Whether claimed deployment settings are covered by linked study artifacts.
- Whether assay or instrument contexts match the manuscript language.
- Whether runtime environments have reproducible rerun evidence.
- Whether strong claims are missing required subgroup coverage.
- Whether a broad transfer claim lacks external validation.
- Whether claims contain unresolved or malformed evidence references.
- Whether duplicate evidence identifiers make claim provenance ambiguous.
- Whether empty or malformed review packets fail closed instead of crashing.
- Whether a critical claim is being hidden by a high aggregate average.

## Outputs

The demo creates:

- `reports/summary.json`: structured review packet.
- `reports/reviewer-packet.md`: reviewer-facing findings, actions, and research gaps.
- `reports/summary.svg`: visual transfer-risk summary.

## Why This Is Distinct

This is not another broad AI assistant, preregistration checker, retraction sentinel, prompt-safety guard, statistical review, benchmark-leakage auditor, figure/table checker, supplement-readiness module, funding/COI checker, or evidence-trace assistant.

It focuses specifically on whether a manuscript's claims transfer beyond the exact population, setting, assay, and runtime contexts represented by the linked evidence.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

The module uses synthetic data only. It makes no network calls and uses no credentials, private manuscripts, protected health information, payment data, or external APIs.
