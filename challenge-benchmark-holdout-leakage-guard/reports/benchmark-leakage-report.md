# Challenge Benchmark Holdout Leakage Guard Report

Generated challenges: 4
Ready to score: 1
Needs review: 1
Quarantined: 2
Scoring actions: 11
Audit digest: `9c448b358c70c46e32658642098d06c1a80886a70b95771c253ad9185f563723`

## Challenge Decisions

### CH-SAFE-001: Protein stability private holdout scoring
- Status: score
- Holdout artifacts: 1
- Release events: 1
- Solver grants: 1
- Findings: none
- First action: Proceed with sealed evaluator scoring.

### CH-LEAK-002: Climate forecast benchmark with accidental public release
- Status: quarantine
- Holdout artifacts: 1
- Release events: 2
- Solver grants: 1
- Findings: HOLDOUT_RELEASED_TO_PUBLIC_CHANNEL, HOLDOUT_RELEASED_BEFORE_DEADLINE, SOLVER_WORKSPACE_HOLDOUT_GRANT, PUBLIC_BASELINE_HASH_OVERLAP, UNAPPROVED_SPONSOR_EXCEPTION, SUBMISSION_CONTAINS_HOLDOUT_HASH
- First action: Holdout artifact was released through a non-scoring channel.

### CH-REVIEW-003: Materials challenge with late sponsor exception
- Status: review
- Holdout artifacts: 1
- Release events: 1
- Solver grants: 1
- Findings: LATE_SPONSOR_EXCEPTION_REVIEW
- First action: Approved sponsor exception landed inside the benchmark freeze window.

### CH-HOLD-004: Chemistry optimization challenge missing holdout hash
- Status: quarantine
- Holdout artifacts: 1
- Release events: 1
- Solver grants: 0
- Findings: HOLDOUT_HASH_MISSING
- First action: Holdout artifact needs a stable hash before scoring can start.
