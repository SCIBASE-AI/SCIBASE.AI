# Requirement Map

| Issue #12 requirement | Implementation evidence |
| --- | --- |
| Markdown and LaTeX support | `createBlock` supports `markdown` and `latex` blocks and `exportPublicationOutline` preserves them. |
| Cross-references, figures, tables, citations | Sample document includes citation and figure blocks; export includes block labels and references. |
| Code snippets and notebook integration | `notebook` blocks include language, kernel, source, outputs, and annotations. |
| Real-time multi-user editing | `applyOperationBatch` applies ordered operations with deterministic revision updates. |
| Live cursor tracking and presence | `buildPresenceState` returns users, cursor block IDs, selections, and activity. |
| Inline comments and suggestions | `addCommentThread` and `applySuggestion` model anchored comments and change suggestions. |
| Lock/unlock modes for controlled sections | `lockSection`, `unlockSection`, and `ensureWritable` block edits to protected sections. |
| Version history and autosave | `createSnapshot` creates autosave and named snapshots with revision and block copies. |
| Restore/time-machine support | `restoreSnapshot` reconstructs document state from a snapshot. |
| Integrated tasks | `createTask`, `transitionTask`, and task metadata link work to document sections. |
| Document chat/discussion sidebar | Comment threads include participants, status, and timestamped messages. |
