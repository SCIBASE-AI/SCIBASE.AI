# Repository Restore Rehearsal Review

Checked at: 2026-05-20T00:00:00.000Z
Overall decision: unrecoverable
Release hold: yes
Audit digest: 7490262279f610b8e21054add70a442f50759d18673ab3fcb3f0c1fa6c7ca057

## Summary

- Total snapshots: 4
- Restorable: 1
- Needs review: 1
- Quarantined: 1
- Unrecoverable: 1
- Blockers: 8
- Warnings: 5

## Snapshot Decisions

| Snapshot | Repository | Version | Decision | Action | Restore minutes |
| --- | --- | --- | --- | --- | ---: |
| snap-protein-140 | repo-protein-sim | v1.4.0 | restorable | approve_restore | 74 |
| snap-notebook-092 | repo-notebook-bench | v0.9.2 | needs_review | review_before_release | 145 |
| snap-cohort-210 | repo-cohort-data | v2.1.0 | quarantined | quarantine_snapshot | 96 |
| snap-legacy-031 | repo-legacy-model | v0.3.1 | unrecoverable | mark_unrecoverable | 0 |

## Reviewer Tasks

- Escalate unrecoverable snapshots to repository owners before release or archive promotion.
- Quarantine snapshots with missing LFS objects or manifest hash drift until replacement backups pass rehearsal.
- Route warning-level restore cases to repository maintainers for release-readiness review.
