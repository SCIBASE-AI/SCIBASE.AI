# Submission License Risk Report: submission-risky-cell-model

Status: block_sponsor_review
Team: Open Biomarker Lab
Audit digest: 770cc68328cd9c9d28f431c82f91b3022fc5433f4ee309085d59a695d9384d2d

## Summary

- Blockers: 11
- Warnings: 7
- Artifacts reviewed: 3
- Dependencies reviewed: 3

## Actions

- BLOCKER [data-steward] patient-feature-table: Convert to reviewer-safe derived features or keep raw data in a controlled data room.
- BLOCKER [security-reviewer] bio-csv-parser: Upgrade to 2.4.8 or provide a compensating-control note.
- BLOCKER [license-reviewer] plotlab: Replace plotlab or document a sponsor-approved exception.
- BLOCKER [sponsor-admin] patient-feature-table: Add sponsor-visible export-control handling before reviewer access.
- BLOCKER [license-reviewer] solver-code: Replace solver-code, obtain sponsor exception approval, or remove it from the review package.
- BLOCKER [license-reviewer] patient-feature-table: Replace patient-feature-table, obtain sponsor exception approval, or remove it from the review package.
- BLOCKER [license-reviewer] weights: Replace weights, obtain sponsor exception approval, or remove it from the review package.
- BLOCKER [ethics-reviewer] patient-feature-table: Attach consent evidence or redact the dataset from the submission package.
- BLOCKER [model-reviewer] weights: Use an allowed model license or provide an inference-only review endpoint.
- BLOCKER [platform-operator] patient-feature-table: Disable raw download and expose only approved aggregate reviewer packets.
- BLOCKER [data-steward] patient-feature-table: Remove the raw dataset, replace it with a synthetic digest, or get sponsor and ethics approval.
- WARNING [security-reviewer] stats-core: Upgrade to 1.8.4 or provide a compensating-control note.
- WARNING [solver-team] bio-csv-parser: Pin the dependency version so the submission can be reproduced.
- WARNING [solver-team] plotlab: Pin the dependency version so the submission can be reproduced.
- WARNING [model-reviewer] weights: Attach training-data provenance notes before final award review.
- WARNING [solver-team] solver-code: Attach notice and attribution evidence for solver-code.
- WARNING [solver-team] patient-feature-table: Attach notice and attribution evidence for patient-feature-table.
- WARNING [solver-team] weights: Attach notice and attribution evidence for weights.

Synthetic local demo data only; no live services, private datasets, or external scanners were used.

