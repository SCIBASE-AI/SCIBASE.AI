# Requirement Map

| Issue #12 requirement | Implementation |
| --- | --- |
| Markdown, LaTeX, and code/notebook support | Sample document includes `markdown`, `latex`, and `jupyter` block kinds with renderer/kernel metadata. |
| Real-time collaboration | `presence` operations store live cursor/status snapshots per collaborator. |
| Multi-user editing | `insert_text`, `replace_text`, and metadata operations include actor IDs and are replayable. |
| Inline comments and suggestions | `addInlineComment()`, `addSuggestion()`, and `acceptSuggestion()` model review threads and suggested edits. |
| Section locks | `lock_block` and `unlock_block` operations protect controlled sections. |
| Autosave and version history | `operationLog` records every operation; `createVersionSnapshot()` creates named milestones. |
| Integrated task workflow | `assignTask()` links tasks to document blocks with assignees, due dates, and statuses. |
| Jupyter notebook integration metadata | Notebook blocks include language, kernel, output type, and execution status metadata. |
| Export/publication outline | `exportPublicationOutline()` emits ordered blocks plus review state counts and latest version. |
| Reviewer-friendly demo/API | `src/demo.js` prints a full report; `src/api.js` serves `/health` and `/demo-report`. |
| Tests | `test/editor-ledger.test.js` covers operation replay, locks, suggestions, versions, outline, and demo shape. |
