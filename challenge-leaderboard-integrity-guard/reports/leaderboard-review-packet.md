# Challenge Leaderboard Review Packet

Challenge: Open Materials Yield Prediction Challenge (sci-benchmark-alpha)
Decision: blocked
Payout hold: yes
Audit digest: 20cbfe3b30491d2061ed70b279f85778e76a3029ac2e6239ef7749694422cd5d

## Submission Decisions

| Submission | Team | Decision | Reported | Recomputed |
| --- | --- | --- | ---: | ---: |
| sub-valid-001 | team-mendeleev | approved | 0.96 | 0.96 |
| sub-review-002 | team-curie | needs_review | 0.94 | 0.94 |
| sub-block-003 | team-feynman | blocked | 0.992 | 0.901 |

## Blockers

- metric_recomputation_mismatch: Reported score does not match the recomputed score within tolerance.
- holdout_access_detected: Submission team accessed holdout data before final scoring.
- holdout_leakage_score_high: Leakage detector score is above the block threshold.
- benchmark_package_mismatch: Submission was evaluated against a different benchmark package hash.

## Warnings

- submission_limit_exceeded: Team has exceeded the configured submission limit.
- resubmission_window_violation: Team resubmitted before the configured cooldown window elapsed.
- audit_trail_missing: Submission lacks an audit trail for ingestion, evaluation, and publication events.

## Reviewer Tasks

- Freeze payout and rotate holdout credentials before any winner announcement.
- Re-run the scorer from immutable benchmark artifacts and attach the scorer log to the challenge record.
- Review challenge rules for submission abuse and document whether warnings affect prize eligibility.
- Resolve warning-level findings before moving any submission to sponsor approval.
