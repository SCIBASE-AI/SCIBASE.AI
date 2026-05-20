# Challenge Leaderboard Integrity Guard

This module adds a payout-safety guard for scientific benchmark and challenge leaderboards. It evaluates challenge configuration, submission history, reported metrics, recomputed scores, benchmark package hashes, holdout access indicators, and tie-break readiness before sponsor approval or prize payout.

The guard is designed for the Scientific Bounty System workstream in issue #18. It focuses on a high-risk point in paid science workflows: deciding whether a leaderboard winner is valid enough to release funds.

## What It Checks

- Challenge identity, metric name, and maximize/minimize direction.
- Immutable benchmark package hash format and freshness.
- Blinded holdout status and holdout access indicators.
- Reported score versus recomputed score tolerance.
- Submission limits and resubmission cooldown windows.
- Benchmark package hash mismatches between challenge and submission.
- Missing audit trails for ingestion, scoring, and publication.
- Tie-breaker readiness for equal primary scores.

## Decisions

The evaluator returns one of three decisions:

- `approved`: no blockers or warnings; payout can move to sponsor approval.
- `needs_review`: no blockers, but reviewer tasks must be resolved first.
- `blocked`: one or more integrity blockers require payout freeze or challenge remediation.

## Run The Demo

From the repository root:

```bash
node challenge-leaderboard-integrity-guard/test.js
node challenge-leaderboard-integrity-guard/demo.js
```

The demo writes:

- `reports/leaderboard-integrity-report.json`
- `reports/leaderboard-review-packet.md`
- `reports/leaderboard-integrity.svg`

This submission also includes `reports/demo.mp4` as a short visual preview of the generated integrity packet.

## Integration Shape

The exported `evaluateChallenge(input)` function accepts:

- `challenge`: challenge rules, metric contract, benchmark artifact metadata, holdout policy, and tie-breakers.
- `submissions`: current submissions to evaluate.
- `submissionHistory`: prior submission records for cooldown and limit checks.

It returns a deterministic audit packet with findings, reviewer tasks, payout hold status, a reviewable leaderboard, and an `auditDigest` that can be attached to sponsor approvals or arbitration notes.
