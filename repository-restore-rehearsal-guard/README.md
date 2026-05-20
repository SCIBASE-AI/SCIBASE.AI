# Repository Restore Rehearsal Guard

This module adds a focused restore rehearsal guard for the Project Repository & Version Control bounty in issue #10. It evaluates whether versioned scientific repository snapshots can actually be restored before release, export, or archive promotion.

The scope is distinct from broad repository ledgers, release engines, structured diff/rollback modules, provenance attestations, release embargo controls, notebook replay ledgers, schema migration ledgers, citation-impact gates, API/export verifiers, merge queues, environment drift gates, access-review gates, and DOI tombstone submissions.

## What It Checks

- Repository, version, and snapshot identity.
- Restore drill pass/fail status and duration against recovery time objective.
- Manifest hash coverage across manuscript, code, data, results, and environment components.
- Git LFS or large-artifact availability.
- Backup copy count, retention expiry, and encryption-key escrow evidence.
- Signed release tag and fork lineage continuity.
- Active DOI/citation target continuity.
- Quarantine, recovery, release-hold, and deterministic audit digest outputs.

## Decisions

The evaluator returns:

- `restorable`: restore rehearsal passed and release evidence is complete.
- `needs_review`: warning-level RTO, signature, fork-lineage, or backup-copy issues need maintainer review.
- `quarantined`: missing components, hash drift, missing LFS objects, or citation target issues block release.
- `unrecoverable`: failed drill, expired retention, or missing key escrow requires owner escalation.

## Run The Demo

From the repository root:

```bash
node repository-restore-rehearsal-guard/test.js
node repository-restore-rehearsal-guard/demo.js
```

The demo writes:

- `reports/restore-rehearsal-report.json`
- `reports/restore-rehearsal-review-packet.md`
- `reports/repository-restore-rehearsal.svg`

This submission also includes `reports/demo.mp4` as a short visual preview of the generated restore review packet.
