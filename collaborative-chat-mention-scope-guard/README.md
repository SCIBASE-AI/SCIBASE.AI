# Collaborative Chat Mention Scope Guard

This module is a focused real-time collaborative editor slice for issue #12. It
checks whether document chat and sidebar `@mentions` are safe before alerts or
in-app notifications are created.

The guard uses synthetic data only and has no external service dependencies.

## Checks

- Mentioned collaborators who are not members of the target section.
- Blinded reviewer identities mentioned in author-visible threads.
- External collaborators mentioned in restricted sections.
- Notebook-cell mentions that target users without cell access.
- Mentions inside locked sections that require owner approval.
- Redaction actions for private section titles before fanout.

## Local Verification

```bash
node collaborative-chat-mention-scope-guard/test.js
node collaborative-chat-mention-scope-guard/demo.js
```

Demo artifacts are written to
`collaborative-chat-mention-scope-guard/reports/`.

## Issue #12 Mapping

This maps to the editor's document chat, section collaboration, notebook-cell
annotation, user presence, and controlled-section workflows. It is separate from
discussion sidebar auditing, notification visibility, private-comment export,
presence privacy/liveness, suggestion provenance, clipboard import, local cache,
find/replace, data availability, and section-lock arbitration slices.
