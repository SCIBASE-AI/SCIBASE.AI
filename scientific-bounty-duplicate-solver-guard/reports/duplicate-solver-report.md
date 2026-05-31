# Scientific Bounty Duplicate Solver Guard

Status: **blocked**

## Summary

- Submissions checked: 4
- Blockers: 3
- Review items: 2
- Eligible for scoring: 0

## Blockers

- SOLVER_MULTI_SUBMISSION: Solver solver-one appears on multiple submissions for the same bounty phase.
- TEAM_MULTI_SUBMISSION: Team team-redwood submitted more than once in this challenge phase.
- ARTIFACT_HASH_OVERLAP: sub-alpha and sub-beta share too many artifact hashes for independent scoring.

## Manual Review

- PAYMENT_ROUTE_REUSED: Payment route stripe:acct_redwood is shared by multiple submissions and needs sponsor review.
- PAYMENT_ROUTE_REUSED: Payment route bank:institutional-lab-42 is shared by multiple submissions and needs sponsor review.

## Scope

This guard supports SCIBASE scientific bounty arbitration by detecting repeated solver identities, repeated teams, shared payment routes, copied artifact hashes, and unusually similar submission summaries before sponsor scoring or payout routing.
