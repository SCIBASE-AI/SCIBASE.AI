# Requirements Map

| Issue #12 requirement | Coverage in this module |
| --- | --- |
| Continuous autosave with local caching | Local snapshots are compared against the latest remote autosave per section. |
| Fine-grained version tracking for every edit | Autosave events are ordered and compared against the target named version. |
| Time-machine restore and compare flow | `restorePlan` identifies the target version, sections, preserved events, and cache merges. |
| Named versions for major milestones | Restore targets must be named versions with stable content hashes. |
| Multi-user editing and change tracking | Unacknowledged collaborator edits are treated as overwrite conflicts. |
| Locking/unlock modes for controlled sections | Section locks block restore unless the actor is owner/admin or owns the lock. |
| Activity/audit status | The result emits `collab_editor.autosave_restore.evaluated` with a recovery fingerprint. |

## Non-Overlap Note

This submission is separate from broad collaborative editor foundations, offline conflict resolution, review freeze lanes, discussion sidebar auditing, reference formatting, figure/table review, and authorship governance. It focuses specifically on autosave recovery and named-version restore safety.
