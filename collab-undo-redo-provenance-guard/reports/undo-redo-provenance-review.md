# Undo Redo Provenance Review

Generated: 2026-05-28T00:00:00.000Z

## Summary

- Requests reviewed: 6
- Allowed: 2
- Deferred: 0
- Blocked: 4
- Average provenance score: 60

## Requirement Map

- Real-time collaboration: validates inverse operations before shared document mutation.
- Version history and autosave: ties undo/redo to section versions and restore snapshots.
- Rich scientific editing: protects notebook outputs, final-review sections, comments, and task anchors.
- Audit logs: emits reviewer-ready allow, defer, or block decisions for every request.

## Request Decisions

### req-clean-own-undo

- Decision: allow
- Provenance score: 100
- Issues: 0
- Action: Apply inverse operation and append an audit event with target operation, actor, and snapshot hash.

### req-other-author-hijack

- Decision: block
- Provenance score: 30
- Issues: 2
- Action: Require explicit editor override before applying the inverse operation.
- Action: Open a conflict review instead of applying the undo automatically.

### req-stale-range

- Decision: block
- Provenance score: 50
- Issues: 2
- Action: Rebase the inverse operation against the latest section version.
- Action: Open a conflict review instead of applying the undo automatically.

### req-locked-notebook-redo

- Decision: block
- Provenance score: 50
- Issues: 2
- Action: Require lock-owner approval before inverse operation application.
- Action: Attach notebook output and execution-count snapshot before mutation.

### req-editor-override

- Decision: allow
- Provenance score: 100
- Issues: 0
- Action: Apply inverse operation and append an audit event with target operation, actor, and snapshot hash.

### req-comment-anchor-delete

- Decision: block
- Provenance score: 30
- Issues: 2
- Action: Require explicit editor override before applying the inverse operation.
- Action: Keep the reviewer comment and create a separate resolution task.
