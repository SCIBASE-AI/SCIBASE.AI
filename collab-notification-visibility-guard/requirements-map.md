# Requirements Map

Issue #12 asks for a real-time collaborative research editor and interface. This contribution covers a narrow interface safety slice: notification visibility and digest fanout for collaborative editing events.

## Real-Time Collaboration

- Inline comments, suggestions, and review notes can generate notifications.
- The guard evaluates each notification route against recipient role, scope, and channel.
- Private reviewer threads are held when a recipient is not a participant or lacks private-thread permissions.

## User Presence And Activity Status

- This module does not duplicate presence tracking. It complements presence work by checking what leaves the editor through notification channels after collaboration events occur.

## Locking And Controlled Sections

- Section lock notifications are checked for private section titles and embargoed anchors.
- Recipients without section or embargo access receive held or sanitized payloads.

## Jupyter Notebook Integration

- Notebook output notifications are checked for restricted notebook paths.
- Collaborators without the matching notebook scope receive sanitized payloads before any push or email fanout.

## Integrated Task And Review Workflow

- Export digest notifications that include private collaborator notes require a safe role, channel, and receipt.
- The output packet gives reviewers a deterministic route-by-route audit trail.

## Version History And Autosave Adjacent Safety

- The guard emits a deterministic `auditDigest` for the evaluated notification batch.
- Reviewer artifacts can be attached to a release, autosave checkpoint, or publication export review.

## Non-Overlap Statement

This is not another broad editor foundation, offline conflict resolver, notebook workbench, reference formatter, authorship governance module, freeze/recovery lane, discussion sidebar audit, autosave recovery module, round-trip fidelity checker, review decision ledger, task dependency guard, equation/figure anchor guard, notebook kernel lease guard, presence privacy guard, accessibility parity guard, manuscript evidence-binding guard, or embargo release guard. It focuses specifically on notification and digest payload visibility after collaborative editor events.
