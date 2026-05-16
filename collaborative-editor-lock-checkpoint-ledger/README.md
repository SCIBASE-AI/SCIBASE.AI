# Collaborative Editor Lock Checkpoint Ledger

This module adds a focused recovery-control slice for a real-time collaborative research editor. It evaluates synthetic document sessions for stale section locks, locked-section edits, live presence safety, autosave/local-cache risk, hashed checkpoints, named restore points, and unresolved blocking comments or tasks.

## What It Covers

- Hard and soft section locks for controlled manuscript, figure, code, and notebook sections.
- Stale-lock recovery based on expiry time, lock age, and live presence.
- Non-owner edit detection on locked sections.
- Autosave and local-cache health checks using sync age and unsynced operations.
- Hash-backed checkpoints and named versions for time-machine restore.
- Blocking comment and task enforcement before final release.
- HMAC-signed audit events for reviewer-ready restore decisions.
- Synthetic collaboration data only; no credentials or live document contents.

## Run It

```bash
npm run check
npm test
npm run demo
npm run demo:gif
```

## Demo Output

```text
Collaborative editor lock checkpoint demo
As of 2026-05-16T12:00:00.000Z: 1 ready, 1 needs review, 1 blocked
Findings: 9 blockers, 3 review items
doc-neuro-submission: ready checkpointAge=2m blockers=0 reviews=0
  top risk: no open risks
doc-figure-appendix: blocked checkpointAge=135m blockers=9 reviews=0
  top risk: autosave: browser-chen has 9 unsynced operation(s) and last synced 130 minute(s) ago
doc-methods-draft: needs_review checkpointAge=15m blockers=0 reviews=3
  top risk: autosave: browser-dina has pending local edits
Signed audit event: doc-neuro-submission digest=... signature=...
```

## Files

- `src/lock-checkpoint-ledger.js` - dependency-free lock and checkpoint recovery evaluator.
- `data/sample-collaboration-ledger.json` - synthetic collaborative editor sessions.
- `test/lock-checkpoint-ledger.test.js` - coverage for ready/review/blocked restore states.
- `docs/requirement-map.md` - issue #12 coverage and non-overlap notes.
- `docs/demo.svg` and `docs/demo.gif` - short demo artifacts for review.
