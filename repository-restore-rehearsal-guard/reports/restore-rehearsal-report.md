# Repository Restore Rehearsal Report

Repositories reviewed: 3
Restore-ready repositories: 1
Held repositories: 2
Critical findings: 6
Warning findings: 4
Audit digest: `33359f292086b7e89d2ea1bf3c76937a1557755ddf9627660e44c40cb7f1d319`

## Repository Decisions

### Neuro Reproducibility Atlas
- Status: restore_ready
- Snapshot: snap-2026-05-21
- Candidate tag: v1.2.0
- Checks passed: 11/11
- Finding codes: none

### Climate Table Fork
- Status: hold_restore_rehearsal
- Snapshot: snap-2026-05-08
- Candidate tag: preprint-v0.9
- Checks passed: 5/11
- Finding codes: restore_drill_recent_passed, ref_coverage, tag_coverage, component_manifest_integrity, artifact_mirror_ready, environment_lock_coverage

### Protein Model Sandbox
- Status: hold_restore_rehearsal
- Snapshot: snap-2026-04-14
- Candidate tag: v0.4.0
- Checks passed: 7/11
- Finding codes: snapshot_recency, restore_drill_recent_passed, notebook_replay_recent, export_manifest_linked

## Remediation Queue
- climate-table-fork/snap-2026-05-08: run_restore_rehearsal (critical)
- climate-table-fork/snap-2026-05-08: rebuild_snapshot_refs (critical)
- climate-table-fork/snap-2026-05-08: attach_release_tag (warning)
- climate-table-fork/snap-2026-05-08: reconcile_component_manifest (critical)
- climate-table-fork/snap-2026-05-08: repair_artifact_mirror (critical)
- climate-table-fork/snap-2026-05-08: attach_environment_locks (warning)
- protein-model-sandbox/snap-2026-04-14: refresh_release_snapshot (warning)
- protein-model-sandbox/snap-2026-04-14: run_restore_rehearsal (critical)
- protein-model-sandbox/snap-2026-04-14: rerun_notebook_replay (warning)
- protein-model-sandbox/snap-2026-04-14: generate_export_manifest (critical)
