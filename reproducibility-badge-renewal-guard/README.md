# Reproducibility Badge Renewal Guard

This module adds a focused reproducibility badge renewal and expiry guard for the Community & User Reputation System in issue #15. It evaluates whether profile badges and leaderboard reputation deltas tied to reproducibility should be renewed, held for review, expired, or revoked.

The scope is distinct from broad reputation ledgers, endorsement ring guards, mentorship ladders, correction-impact ledgers, contributor credit attestations, peer-review calibration, COI assignment, transparency receipts, abuse/appeals modules, and dataset reuse credit modules.

## What It Checks

- Independent verifier count and verifier independence from project authors.
- Rerun pass rate against the renewal threshold.
- Rerun evidence freshness.
- Artifact hash drift across data, code, and environment evidence.
- Retraction notices, major corrections, and open badge appeals.
- Reputation delta and leaderboard hold decisions.

## Decisions

The evaluator returns:

- `renewed`: evidence is fresh, independent, passing, and hash-stable.
- `needs_review`: warnings need moderator review before reputation deltas publish.
- `expired`: evidence is missing, stale beyond policy, low-pass, or hash-drifted.
- `revoked`: retraction or identity-critical blocker requires immediate badge removal.

## Run The Demo

From the repository root:

```bash
node reproducibility-badge-renewal-guard/test.js
node reproducibility-badge-renewal-guard/demo.js
```

The demo writes:

- `reports/badge-renewal-report.json`
- `reports/badge-renewal-review-packet.md`
- `reports/badge-renewal.svg`

This submission also includes `reports/demo.mp4` as a short visual preview of the generated reputation packet.
