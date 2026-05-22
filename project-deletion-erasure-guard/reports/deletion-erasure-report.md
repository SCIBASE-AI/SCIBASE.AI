# Project Deletion And Erasure Guard Report

As of: 2026-05-22
Batch digest: `693f7ad981c20bca563f8b75845d69c83c91c8f946c989c3bda11275170732b7`

## Summary

- Requests reviewed: 5
- Blocked requests: DEL-PRJ-552
- Decisions: approve_recoverable_delete=1, steward_review_required=1, approve_tombstone_delete=1, detach_profile_preserve_attribution=1, preserve_anonymous_review_escrow=1
- Modes: recoverable_delete=1, blocked=1, tombstone=1, redacted_erasure=2

## Request Decisions

| Request | Type | Action | Severity | Mode | Reason |
| --- | --- | --- | --- | --- | --- |
| DEL-PRJ-441 | project_deletion | approve_recoverable_delete | low | recoverable_delete | private project/profile has verified authority, no holds, and policy recovery window |
| DEL-PRJ-552 | project_deletion | steward_review_required | critical | blocked | active retention holds: irb_retention, funder_retention |
| DEL-PRJ-620 | project_deletion | approve_tombstone_delete | medium | tombstone | public DOI, citation, fork, or visibility evidence requires a citation-safe tombstone |
| ERASE-USER-118 | profile_erasure | detach_profile_preserve_attribution | medium | redacted_erasure | profile has authored or administered project links that need attribution-preserving detachment |
| ERASE-USER-221 | profile_erasure | preserve_anonymous_review_escrow | medium | redacted_erasure | anonymous review pseudonyms or appeals require escrow-preserving erasure |

## Guardrails

- Uses synthetic project, profile, consent, hold, and escrow records only.
- Does not call OAuth, SAML, ORCID, identity providers, live projects, or production access-control systems.
- Blocks destructive finalization while retention/legal/IRB/funder holds or authority gaps remain.
- Preserves citation tombstones and minimized audit receipts rather than erasing public scientific attribution.
