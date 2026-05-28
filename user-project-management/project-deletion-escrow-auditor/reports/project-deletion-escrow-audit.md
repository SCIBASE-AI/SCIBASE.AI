# Project Deletion Escrow Audit

Project: project-quantum-cell-archive
Action: delete
Decision: block-destructive-project-action
Risk score: 100
Scheduled at: 2026-05-29T12:00:00Z
Audit digest: dc9c67424bd6a288

## Findings
- [blocker] Requester lacks permission for destructive project action: user-editor role=editor attempted delete.
  Action: Require an owner/admin role and a fresh authorization event before deletion or archive.
- [blocker] Deletion escrow window is too short: project-quantum-cell-archive escrow window is 36h, below 72h.
  Action: Extend the scheduled deletion time or route to manual institutional review.
- [high] No rollback checkpoint is attached: project-quantum-cell-archive has no rollback checkpoint for delete.
  Action: Create a recovery snapshot before irreversible archive/delete execution.
- [high] No pre-delete export bundle is attached: project-quantum-cell-archive has no export bundle for delete.
  Action: Generate a manifest-backed export bundle before allowing destructive project changes.
- [blocker] Published DOI project lacks a tombstone plan: project-quantum-cell-archive DOI=10.1234/scibase.synthetic.11 without tombstone metadata.
  Action: Prepare DOI tombstone and citation-preservation metadata before deletion.
- [high] Indexed project lacks a redirect URL: project-quantum-cell-archive is indexed with no redirectUrl.
  Action: Add a persistent redirect for search engines, institutional repositories, and citations.
- [high] Not all active collaborators were notified: user-reviewer did not receive deletion notice.
  Action: Notify all active collaborators and give them a chance to export, fork, or dispute the action.
- [medium] Collaborator notice window is shorter than policy: project-quantum-cell-archive notice window is 34h, below 48h.
  Action: Delay execution until the configured collaborator notice period has elapsed.
- [blocker] Project is under legal or compliance hold: project-quantum-cell-archive legalHold=institutional records retention review.
  Action: Block deletion until legal/compliance owners release the hold.
- [high] Project has active review dependencies: project-quantum-cell-archive has active reviews: peer-review-17, grant-closeout-04.
  Action: Pause deletion until open peer review, grant, or institutional review dependencies are resolved.
- [medium] Private fork attribution has not been migrated: project-quantum-cell-archive has private forks without migrated attribution.
  Action: Migrate attribution records so downstream forks keep provenance after deletion.
- [high] Project has unsettled compute charges: project-quantum-cell-archive has $18.75 unsettled.
  Action: Settle or waive compute charges before project deletion.

## Safety
- Synthetic project administration data only; no live projects, private files, identity providers, billing providers, credentials, or external APIs.
