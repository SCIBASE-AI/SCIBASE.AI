# Section Lock Autosave Audit: Cardiometabolic Manuscript Draft

- Decision: hold-collaboration-sync
- Risk score: 100
- Sections reviewed: 3
- Events reviewed: 5
- Autosaves reviewed: 2
- Versions reviewed: 3
- Audit digest: a1ea7a73c9851476

## Findings

- [high] LOCK_LEASE_EXPIRED (methods-final-figures)
  - Lock for section methods-final-figures expired at 2026-05-28T17:40:00Z.
  - Recommendation: Expire stale locks and notify the lock owner before accepting new edits.
- [critical] LOCKED_SECTION_EDIT (methods-final-figures)
  - guest-ravi edited locked section methods-final-figures owned by editor-maya.
  - Recommendation: Reject the edit or require an explicit unlock approval before applying it.
- [critical] UNAUTHORIZED_UNLOCK (primary-results)
  - guest-ravi tried to unlock primary-results without authority.
  - Recommendation: Require lock-owner, section-owner, or maintainer approval for unlock events.
- [critical] LOCKED_SECTION_EDIT (primary-results)
  - author-lee edited locked section primary-results owned by stat-reviewer.
  - Recommendation: Reject the edit or require an explicit unlock approval before applying it.
- [high] OFFLINE_EDIT_CONFLICT (primary-results)
  - Offline edit evt-003 arrived for locked section primary-results.
  - Recommendation: Queue offline edits behind server-side section-lock reconciliation.
- [low] CURSOR_ON_LOCKED_REGION (primary-results)
  - guest-ravi presence entered locked section primary-results.
  - Recommendation: Show a read-only presence state when a user cursor enters a locked section.
- [medium] NAMED_VERSION_WITH_DIRTY_STATE (supplemental-code)
  - Named version v-submit-candidate was requested while the document had unsaved edits.
  - Recommendation: Create the named version only after all edits are autosaved.
- [high] AUTOSAVE_GAP (methods-final-figures)
  - Autosave lagged 14 minutes for methods-final-figures.
  - Recommendation: Force a local snapshot before accepting more collaborative changes.
- [medium] AUTOSAVE_GAP (primary-results)
  - Autosave lagged 4 minutes for primary-results.
  - Recommendation: Force a local snapshot before accepting more collaborative changes.
- [critical] VERSION_PARENT_MISSING
  - Version v-analysis-pass points to missing parent v-missing-parent.
  - Recommendation: Block restore/compare actions until the version chain is repaired.
- [high] RESTORE_OVERWRITES_UNSAVED (primary-results)
  - Restore restore-001 would overwrite 2 unsaved edits.
  - Recommendation: Require an explicit conflict-resolution step before restoring the version.

## Release Gates

- [!] No edits accepted inside hard-locked sections by non-owners.
- [!] Autosave lag stays within the project policy.
- [!] Version history has no missing parents.
- [!] Restore requests cannot overwrite unsaved work.
- [!] Unlock events are owner or maintainer approved.
