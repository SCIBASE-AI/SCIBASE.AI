# Team Payout Split Ledger

## Summary

- Challenges reviewed: 3
- Payable ledgers: 1
- Blocked ledgers: 2
- Held ledgers: 2
- Unlocked funds: $2300.00
- Locked funds: $400.00

## Challenge Ledgers

### bio-marker-panel

- Title: Biomarker validation panel
- Payable: true
- Unlocked: $800.00
- Locked: $400.00
- Receipt status: ready_for_sponsor_review
  - hold: milestone_locked - replication is pending_sponsor_review; funds stay locked until sponsor acceptance.

### climate-forecast

- Title: Regional climate forecast benchmark
- Payable: false
- Unlocked: $900.00
- Locked: $0.00
- Receipt status: blocked
  - block: payout_route_unverified - solver-epsilon has payout route status pending.
  - block: split_total_mismatch - Contributor splits total 9500 basis points instead of 10000.
  - block: institution_overhead_exceeds_cap - solver-delta routes 2500 basis points to an institution, above the 1200 cap.

### quantum-noise

- Title: Quantum noise reduction challenge
- Payable: false
- Unlocked: $600.00
- Locked: $0.00
- Receipt status: blocked
  - block: institution_overhead_exceeds_cap - solver-zeta routes 8000 basis points to an institution, above the 1500 cap.
  - hold: solver_share_below_minimum - solver-zeta keeps 1000 basis points after overhead, below the 1200 minimum.
  - hold: solver_share_below_minimum - solver-eta keeps 1000 basis points after overhead, below the 1200 minimum.

