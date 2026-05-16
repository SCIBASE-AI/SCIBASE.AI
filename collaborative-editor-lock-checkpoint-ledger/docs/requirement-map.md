# Requirement Map

Issue: SCIBASE-AI/SCIBASE.AI#12 - Real-time collaborative research editor & interface

This module adds a focused lock and checkpoint recovery ledger for collaborative editor reliability. It is intentionally separate from broad editor implementations, operation replay modules, offline conflict rebasing, notebook workbenches, reference-formatting workbenches, and authorship governance submissions.

## Coverage

| Issue capability | This slice |
| --- | --- |
| Locking / unlock modes | Evaluates hard and soft section locks, stale lock ownership, lock reasons, and transfer/recovery actions. |
| Live presence and activity | Uses recent presence to distinguish active owners from stale locks. |
| Inline comments and tasks | Blocks release when lock-bound comments or tasks remain unresolved. |
| Continuous autosave and local caching | Checks local cache sync age, unsynced operations, and checkpoint cadence. |
| Fine-grained version history | Requires hashed checkpoints and named restore points after major milestones. |
| Time-machine restore readiness | Produces restore recommendations and HMAC-signed audit events. |

## Non-Overlap Notes

- Not a broad collaborative editor implementation.
- Not an operation replay or offline edit rebasing engine.
- Not a notebook execution or reference-formatting workbench.
- Not an authorship/submission approval workflow.
- Focus is controlled section lock recovery plus autosave checkpoint readiness.

## Verification

```bash
npm run check
npm test
npm run demo
npm run demo:gif
```
