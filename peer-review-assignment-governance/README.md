# Peer Review Assignment Governance

Self-contained contribution for SCIBASE issue #15, focused on conflict-of-interest checks and reviewer assignment governance for the Community & User Reputation System.

The module helps review chairs answer:

- Which reviewers are eligible for a public, anonymous, or double-blind assignment?
- Which candidates are blocked by institution, collaboration, coauthor, financial, or disclosure conflicts?
- Does the selected slate cover the project methods and scientific topics?
- Which trust, workload, and reputation signals drove the assignment decision?

It is deterministic, dependency-free, credential-free, and uses synthetic sample data only.

## Run

```bash
cd peer-review-assignment-governance
npm run check
npm test
npm run demo
```

Demo recording: `docs/review-assignment-demo.mp4`

## What It Includes

- `src/review-assignment-governance.js` - core COI detection, trust scoring, workload balancing, reviewer slate construction, chair checklist, and audit digest logic.
- `sample-data.json` - synthetic project, reviewer profiles, workload, funder, institution, and disclosure records.
- `test.js` - Node assertion tests for overlap scoring, hard COI blocking, conditional reviewers, slate coverage, digest changes, and validation errors.
- `demo.js` - CLI reviewer-chair demo that prints the selected slate, blocked reviewers, checklist, coverage, and audit digest.
- `docs/requirement-map.md` - direct mapping to issue #15 requirements.

## Design Notes

This is intentionally not another broad reputation ledger. It focuses on the operational point where reputation can fail if conflicts are not handled before peer-review invitations:

- Hard conflicts are blocked before ranking.
- Medium-risk disclosures require chair review instead of being hidden inside a score.
- Reviewer identities are masked with blind labels in the selected slate.
- Topic and method coverage are checked after assignment so review chairs can spot gaps.
- The audit digest lets future backend work persist and compare assignment packets.
