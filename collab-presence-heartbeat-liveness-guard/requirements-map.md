# Requirements Map

Issue #12 asks for a real-time collaborative research editor with live cursor tracking, user presence indicators, activity status, comments, suggestions, section controls, autosave/versioning, and notebook collaboration. This module covers the liveness safety layer that must run before cursor and presence broadcasts.

| Issue #12 area | Implementation |
| --- | --- |
| Multi-user editing | Reviews active collaboration sessions before they are included in room fanout. |
| Live cursor tracking | Drops stale, ghost, duplicate, and orphan cursor records before broadcast. |
| User presence indicators | Emits sanitized active/reconnecting status and suppresses stale presence. |
| Activity status | Expires typing indicators independently from session presence. |
| Controlled collaboration | Removes expired presence fanout leases before clients receive stale room state. |
| Autosave/local continuity | Keeps reconnect-grace restore markers without leaking stale cursors. |
| Reviewer-ready governance | Produces deterministic cleanup queues, recovery queues, fanout events, and audit digests. |

## Non-Overlap Notes

Existing issue #12 submissions cover broad editor foundations, deterministic operation replay, offline conflict rebasing, notebook workbench and kernel leases, reference formatting and merging, authorship/submission governance, lock/checkpoint recovery, review freeze lanes, figure/table lanes, discussion/sidebar audit, autosave recovery, round-trip fidelity, review decisions, task dependencies, equation/figure anchors, presence privacy, accessibility parity, evidence binding, embargo release, notification visibility, and data availability.

This module is narrower: it decides whether a live session is fresh enough to appear in the next presence snapshot.
