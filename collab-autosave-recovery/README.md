# Collaborative Autosave Recovery

This module covers the autosave, local-cache recovery, named-version restore, and time-machine side of SCIBASE issue #12.

It evaluates whether a collaborator can restore a shared manuscript to a named version without overwriting unacknowledged edits, violating section locks, or losing newer local cache snapshots.

## What It Does

- Validates that the requester is an active collaborator with edit permissions.
- Checks that the restore target is a named version with a content hash.
- Detects section locks that should block restore.
- Finds unacknowledged autosave events that would be overwritten.
- Preserves conflicting edits through branch restore when allowed.
- Identifies newer local cache snapshots that should be merged before final restore.
- Emits a deterministic audit event and recovery fingerprint.

## Run

```bash
node collab-autosave-recovery/test.js
node collab-autosave-recovery/demo.js
```

The included demo shows a held restore with one newer local cache snapshot queued for merge and no unacknowledged conflict events.
