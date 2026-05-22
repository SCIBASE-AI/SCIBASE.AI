# Collaborative Notification Visibility Guard Report

Project: sci-editor-proj-12-demo
Audit digest: 02f8ceca9fe8760b5554587bfb21d4efeca366f41656e83f6083c53329a3ba80

## Summary

- Total routes evaluated: 11
- Delivered without change: 3
- Sanitized before delivery: 5
- Held for review: 3
- Dropped: 0
- Leakage risks found: 8

## Route Decisions

- evt-reviewer-note -> ed-1 via in_app: deliver
- evt-reviewer-note -> rev-anon-2 via in_app: sanitize
  - Reasons: blinded-reviewer-identity-hidden, restricted-notebook-path-hidden:nb-qc
- evt-reviewer-note -> author-1 via email: hold
  - Reasons: missing-scope:review:R2, not-private-thread-participant, blinded-reviewer-identity-hidden, private-section-title-hidden:methods, restricted-notebook-path-hidden:nb-qc, external-channel-requires-sanitized-digest
- evt-methods-lock -> ed-1 via in_app: deliver
- evt-methods-lock -> author-1 via email: sanitize
  - Reasons: private-section-title-hidden:methods, embargoed-anchor-hidden:methods, external-channel-requires-sanitized-digest
- evt-notebook-output -> ed-1 via in_app: deliver
- evt-notebook-output -> analyst-1 via push: sanitize
  - Reasons: restricted-notebook-path-hidden:nb-qc, external-channel-requires-sanitized-digest
- evt-notebook-output -> author-1 via email: sanitize
  - Reasons: restricted-notebook-path-hidden:nb-qc, external-channel-requires-sanitized-digest
- evt-export-digest -> pm-1 via email: sanitize
  - Reasons: external-channel-requires-sanitized-digest
- evt-export-digest -> author-1 via email: hold
  - Reasons: missing-external-digest-receipt, private-collaborator-note-hidden, external-channel-requires-sanitized-digest
- evt-export-digest -> sponsor-1 via webhook: hold
  - Reasons: missing-scope:manuscript:core, missing-external-digest-receipt, private-collaborator-note-hidden, external-channel-requires-sanitized-digest

## Reviewer Notes

This guard focuses on notification fanout, not the editor canvas itself. It verifies that in-app alerts, email digests, push alerts, and webhook notifications do not disclose restricted collaborative context to recipients who lack the role, scope, channel, or receipt required to see it.
