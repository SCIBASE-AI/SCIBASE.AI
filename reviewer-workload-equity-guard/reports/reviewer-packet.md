# Reviewer Workload Equity Guard

Issue: SCIBASE-AI/SCIBASE.AI#15
Decision: block-reputation-scoring-until-workload-is-fair
Score: 0

## Severity Summary

| Severity | Count |
| --- | ---: |
| critical | 2 |
| high | 6 |
| medium | 3 |
| low | 0 |

## Assignment Decisions

- asg-105: suppress-negative-reputation-delta
  - Protected reasons: over_capacity, rest_window
- asg-106: steward-review-before-scoring
  - Protected reasons: weekly_hours_exceeded, expertise_mismatch
- asg-107: suppress-negative-reputation-delta
  - Protected reasons: unavailable, opted_out

## Findings

- **high / open-review-load-exceeded**: A. Rowan would hold 4 open reviews after asg-105.
  - Action: Reassign or queue the request before applying reputation penalties or leaderboard effects.
  - Refs: rev-001, asg-105
- **high / weekly-review-hour-budget-exceeded**: A. Rowan would reach 13 review hours this week.
  - Action: Suppress negative reputation deltas and route the request to a reviewer with available capacity.
  - Refs: rev-001, asg-105
- **medium / reviewer-rest-window-too-short**: A. Rowan completed a review on 2026-05-21.
  - Action: Defer the new request or remove negative reputation effects until the rest window is met.
  - Refs: rev-001, asg-105
- **high / assignment-due-during-unavailable-window**: asg-105 is due while A. Rowan is unavailable.
  - Action: Move the due date or reassign before the review can change reputation points.
  - Refs: rev-001, asg-105, 2026-05-24
- **high / weekly-review-hour-budget-exceeded**: M. Quinn would reach 10 review hours this week.
  - Action: Suppress negative reputation deltas and route the request to a reviewer with available capacity.
  - Refs: rev-002, asg-106
- **high / reviewer-expertise-mismatch**: asg-106 topic quantum-simulation is outside M. Quinn's declared expertise.
  - Action: Add a mentor, reassign the review, or prevent reputation penalties from mismatched work.
  - Refs: rev-002, asg-106, quantum-simulation
- **medium / early-career-reviewer-high-penalty-risk**: asg-106 applies high negative deltas to an early-career reviewer.
  - Action: Route the assignment through mentor review before applying profile or leaderboard penalties.
  - Refs: rev-002, asg-106
- **critical / reviewer-unavailable-but-penalized**: S. Imani is unavailable but asg-107 still carries decline and late penalties.
  - Action: Block decline/late reputation penalties while the reviewer is unavailable.
  - Refs: rev-003, asg-107
- **critical / reviewer-opt-out-active**: S. Imani has opted out until 2026-05-30.
  - Action: Do not assign reputation-affecting reviews until the opt-out expires.
  - Refs: rev-003, asg-107, 2026-05-30
- **high / assignment-due-during-unavailable-window**: asg-107 is due while S. Imani is unavailable.
  - Action: Move the due date or reassign before the review can change reputation points.
  - Refs: rev-003, asg-107, 2026-05-26
- **medium / review-credit-concentration-too-high**: rev-001 received 67% of recent review credit.
  - Action: Spread review opportunities before awarding additional leaderboard-affecting points.
  - Refs: rev-001

## Safety

- Synthetic reviewer, assignment, availability, and reputation data only
- No profile writes, leaderboard writes, identity calls, email calls, or external review system calls
- No private reviewer identities, credentials, moderation records, or live reputation mutations
