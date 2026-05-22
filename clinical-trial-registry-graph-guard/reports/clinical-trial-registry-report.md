# Clinical Trial Registry Graph Guard Report

As of: 2026-05-22
Graph digest: `94ed1d784ccc3fe141500e6be8f71ff5089e018a61d42737c55279c6c93540a1`

## Summary

- Trials reviewed: 4
- Held or suppressed trials: 3
- Curator actions: 7
- Actions: suppress_clinical_recommendations=2, hold_edges_for_curator_review=1, allow_trial_graph_edges=1

## Trial Decisions

| Trial | Registry | Status | Phase | Action | Severity | Issues |
| --- | --- | --- | --- | --- | --- | ---: |
| trial-alpha | NCT01234567 | completed | phase_2 | suppress_clinical_recommendations | critical | 3 |
| trial-beta | 2023-001234-12 | active_not_recruiting | phase_3 | hold_edges_for_curator_review | high | 3 |
| trial-gamma | ISRCTN12345678 | withdrawn | phase_1 | suppress_clinical_recommendations | critical | 1 |
| trial-delta | NCT76543210 | recruiting | phase_2 | allow_trial_graph_edges | low | 0 |

## Guardrails

- Uses synthetic trial, publication, dataset, protocol, and recommendation graph metadata only.
- Does not call ClinicalTrials.gov, EUCTR, ISRCTN, journal APIs, repositories, or external services.
- Suppresses recommendation edges when registry IDs, trial status, results posting, or linked evidence are unsafe.
- Emits deterministic audit digests and curator actions for reviewer packets.
