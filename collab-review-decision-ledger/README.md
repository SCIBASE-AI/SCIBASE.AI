# Collaborative Review Decision Ledger

This is a focused Real-Time Collaborative Research Editor slice for SCIBASE issue #12. It evaluates whether a collaborative manuscript is ready to freeze or publish by checking unresolved review blockers across comments, suggestions, section locks, approvals, notebook freshness, decision records, and restore-safe snapshots.

## Scope

- Detects unresolved blocking comments.
- Detects open suggestions that must be accepted or rejected.
- Flags stale notebook outputs before release.
- Checks required role approvals for each section.
- Requires freeze-window section locks.
- Requires recorded sidebar decision records.
- Requires restore-ready snapshots before publish.
- Emits deterministic section decision digests and document-level priority actions.

It intentionally does not duplicate broad editor foundations, operation replay, offline conflict rebasing, notebook workbenches, reference formatting, authorship governance, lock/checkpoint recovery, freeze lanes, figure/table review lanes, discussion-sidebar audit, autosave recovery, or round-trip fidelity checks.

## Run

```powershell
node collab-review-decision-ledger/test.js
node collab-review-decision-ledger/demo.js
```

The demo writes:

- `collab-review-decision-ledger/demo-output/review-decision-ledger.json`
- `collab-review-decision-ledger/demo-output/demo.svg`

This PR also includes the required short MP4 demo artifact:

- `collab-review-decision-ledger/demo-output/demo.mp4`

## API

```js
const {
  evaluateReviewDecision,
  buildReleaseSummary,
  createDecisionDigest,
} = require("./collab-review-decision-ledger");

const audit = evaluateReviewDecision({ manuscript, generatedAt });
```
