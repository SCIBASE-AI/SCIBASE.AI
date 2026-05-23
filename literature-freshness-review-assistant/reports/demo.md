# Literature Freshness Review Assistant

Review date: 2026-05-23
Overall digest: 45a5a7683b859d96101b72cc8442e889cd630ad2736fcebe4dd6b85302cd0cd8

## Aggregate

- Reviewed manuscripts: 2
- Held manuscripts: 1
- Revision manuscripts: 0
- Ready manuscripts: 1
- Critical findings: 1
- Major findings: 8
- Actionable findings: 9

## Senolytic cardiac safety manuscript

Status: hold_freshness_review
Digest: 2b28dfa1b6fc17166e45aa06df339015e0dec9da568f3a185015dab564cad637

| Severity | Code | Claim | Detail | Required action |
| --- | --- | --- | --- | --- |
| major | STALE_SUPPORT_WINDOW | claim-tolerability | Latest support is 2021-06-01, older than the 4-year freshness window. | Add recent evidence or downgrade the claim wording. |
| critical | NEWER_CONTRADICTORY_EVIDENCE | claim-tolerability | 2025 systematic review of senolytic cardiometabolic safety (2025-11-18) contradicts older support but is not cited. | Discuss the larger safety signal before claiming broad tolerability. |
| major | STALE_SUPPORT_WINDOW | claim-organoid-methods | Latest support is 2022-02-10, older than the 4-year freshness window. | Add recent evidence or downgrade the claim wording. |
| major | MISSING_NEWER_EVIDENCE | claim-organoid-methods | SCIBASE organoid reporting guidance 2026.1 (2026-02-04) updates older support but is not cited. | Use the 2026.1 organoid reporting checklist for reviewer packets. |
| major | STALE_SUPPORT_WINDOW | claim-atlas-normalization | Latest support is 2021-12-12, older than the 4-year freshness window. | Add recent evidence or downgrade the claim wording. |
| major | MISSING_NEWER_EVIDENCE | claim-atlas-normalization | Single Cell Atlas v4.0 release notes (2026-03-14) supersedes older support but is not cited. | Reconcile claims trained on atlas v2.x or v3.x against v4.0 annotations. |
| major | DATASET_VERSION_DRIFT | claim-atlas-normalization | Claim uses dataset v2.1; current ledger version is v4.0. | Reconcile claims trained on atlas v2.x or v3.x against v4.0 annotations. |
| major | MISSING_NEWER_EVIDENCE | claim-protein-benchmark | Protein structure benchmark leaderboard recalibration (2026-01-22) updates older support but is not cited. | Refresh benchmark claims against the recalibrated 2026.01 leaderboard. |
| major | BENCHMARK_VERSION_DRIFT | claim-protein-benchmark | Claim uses benchmark 2024.10; current ledger version is 2026.01. | Refresh benchmark claims against the recalibrated 2026.01 leaderboard. |

Research gap prompts:
- Freshness gap: update the evidence base for senolytic cardiometabolic safety before treating the claim as current.
- Freshness gap: update the evidence base for organoid assay reporting before treating the claim as current.
- Freshness gap: update the evidence base for single-cell atlas normalization before treating the claim as current.
- Freshness gap: update the evidence base for protein structure benchmark before treating the claim as current.

## Telemetry implant arrhythmia replication note

Status: ready_for_review
Digest: 30b9621c84e89262d698c368e40fcd6fd32bde83bb05cf9be0e70ad5823c4287

| Severity | Code | Claim | Detail | Required action |
| --- | --- | --- | --- | --- |
| info | FRESHNESS_READY | claim-telemetry-risk | Claim cites the current evidence signal for its topic. | No freshness hold required. |
