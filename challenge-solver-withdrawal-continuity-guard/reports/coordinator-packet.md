# Solver Withdrawal Continuity Guard

Challenge: challenge-protein-folding
Decision: hold-workspace-continuity
Generated: 2026-05-22T15:20:00Z

## Summary

- Teams reviewed: 1
- Affected teams: 1
- Withdrawing solvers: 1
- Ready replacements: 0
- Required actions: 7

## Findings

- **critical** missing-withdrawal-notice: solver-1 is withdrawing without a dated notice record.
- **critical** access-revocation-missing: solver-1 still needs workspace access revocation evidence.
- **high** ip-return-missing: solver-1 lacks IP return, retention, or destruction confirmation.
- **critical** team-quorum-broken: team-alpha falls below required active solver quorum after withdrawal.
- **high** artifact-custody-gap: team-alpha has withdrawing-solver artifacts without custody confirmation.
- **medium** milestone-continuity-risk: team-alpha has a milestone due within 7 days of a withdrawal event.
- **medium** stakeholder-notification-gap: team-alpha has incomplete sponsor or reviewer withdrawal notifications.

## Required Actions

- record_withdrawal_notice (solver-1): challenge coordinators need a dated notice before changing solver team state
- revoke_workspace_access (solver-1): private challenge data and submission workspaces must be protected after withdrawal
- confirm_ip_return_duties (solver-1): solver-owned and sponsor-confidential materials need explicit custody status
- restore_team_quorum (team-alpha): challenge fairness requires enough active or eligible replacement solvers before work continues
- confirm_artifact_custody (team-alpha): submission artifacts need owner handoff before sponsor review or scoring continues
- review_milestone_extension (team-alpha): near-term milestones may need sponsor-approved extension or partial-credit handling
- notify_stakeholders (team-alpha): sponsors and reviewers need synchronized withdrawal state before judging or deadlines change

---
# Solver Withdrawal Continuity Guard

Challenge: challenge-materials-screen
Decision: coordinator-review
Generated: 2026-05-22T15:20:00Z

## Summary

- Teams reviewed: 1
- Affected teams: 1
- Withdrawing solvers: 1
- Ready replacements: 1
- Required actions: 2

## Findings

- **high** artifact-custody-gap: team-beta has withdrawing-solver artifacts without custody confirmation.
- **medium** stakeholder-notification-gap: team-beta has incomplete sponsor or reviewer withdrawal notifications.

## Required Actions

- confirm_artifact_custody (team-beta): submission artifacts need owner handoff before sponsor review or scoring continues
- notify_stakeholders (team-beta): sponsors and reviewers need synchronized withdrawal state before judging or deadlines change

---
# Solver Withdrawal Continuity Guard

Challenge: challenge-climate-nowcast
Decision: continuity-ready
Generated: 2026-05-22T15:20:00Z

## Summary

- Teams reviewed: 1
- Affected teams: 1
- Withdrawing solvers: 1
- Ready replacements: 1
- Required actions: 0

No blocking withdrawal continuity gaps detected.
