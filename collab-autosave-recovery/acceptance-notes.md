# Acceptance Notes

## Review Scenarios

1. Ready named-version restore
   - Owner restores selected sections to a hashed named version.
   - There are no unacknowledged remote edits.
   - The restore plan is ready and deterministic.

2. Blocked overwrite
   - A viewer attempts restore.
   - A later autosave from another editor would be overwritten.
   - The result blocks both authorization and unacknowledged overwrite risk.

3. Locked section with branch-preserved edits
   - Editor requests a branch restore that preserves a later reviewer edit.
   - A locked figure section still blocks direct restore.
   - Newer local cache snapshots are surfaced for merge.

## Validation

```bash
node collab-autosave-recovery/test.js
node collab-autosave-recovery/demo.js
node --check collab-autosave-recovery/index.js
node --check collab-autosave-recovery/test.js
node --check collab-autosave-recovery/demo.js
```

The included `demo.mp4` is a five-second visual walkthrough of the restore decision flow.
