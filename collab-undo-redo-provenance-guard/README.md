# Collaborative Undo Redo Provenance Guard

Focused slice for SCIBASE issue #12, Real-time collaborative research editor and interface.

This module validates undo and redo requests before they mutate a shared scientific document. It is narrower than broad editor foundations, operation replay, offline conflict rebasing, autosave recovery, section locks, find/replace safety, comment anchor drift, reference formatting, notebook reproducibility, or review decision ledgers.

## What it checks

- Undo requests target real operations and preserve a stable inverse-operation audit trail.
- Collaborators cannot undo another author's edit unless they have an explicit editor role.
- Stale undo requests are blocked when newer edits touch the same section or range.
- Locked final-review sections cannot be changed through undo/redo side paths.
- Notebook execution undo requires a restore snapshot for outputs and execution counts.
- Comment/task undo cannot delete another reviewer's anchored feedback.
- Redo requests require a matching prior undo and current section version compatibility.

## Local verification

```bash
node collab-undo-redo-provenance-guard/test.js
node collab-undo-redo-provenance-guard/demo.js
node collab-undo-redo-provenance-guard/make-demo-video.js
```

Generated reviewer artifacts are written to `collab-undo-redo-provenance-guard/reports/`.

## Safety

Fixtures are synthetic. The module does not connect to live editors, notebooks, kernels, storage services, or credentials.
