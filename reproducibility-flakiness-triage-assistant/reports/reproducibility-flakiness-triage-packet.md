# Reproducibility Flakiness Triage Packet

Checked at: 2026-05-20T00:00:00.000Z
Overall decision: not_reproducible
Average confidence: 0.51
Audit digest: 717211cbf529281d7a9f76599b5fa0ec681869eec38167e70965b60491fa2b57

## Summary

- Total projects: 6
- Reproducible: 1
- Reproducible with controls: 1
- Flaky needs rerun: 2
- Not reproducible: 2

## Project Decisions

| Project | Runs | Confidence | Likely cause | Decision |
| --- | ---: | ---: | --- | --- |
| Open microscopy segmentation benchmark | 2 | 0.96 | stable_reproduction | reproducible |
| Cell morphology bootstrap interval | 2 | 0.78 | nondeterministic_execution | reproducible_with_controls |
| Notebook with stochastic optimizer | 2 | 0.48 | nondeterministic_execution | flaky_needs_rerun |
| Single-cell batch correction pipeline | 2 | 0.18 | environment_dependency_drift | not_reproducible |
| Literature enrichment notebook | 2 | 0.48 | uncaptured_external_dependency | flaky_needs_rerun |
| Clinical trial subgroup analysis | 2 | 0.18 | independent_failure_history | not_reproducible |

## Assistant Tasks

- Prioritize pinned-environment reruns before peer-review release.
- Require captured external inputs or network mocks in reproducibility bundles.
- Open nondeterminism triage for output hash drift and seed sensitivity.
- Escalate projects with repeated failed independent reproductions to editorial review.
- Add fixed-clock controls to time-sensitive project runs.
