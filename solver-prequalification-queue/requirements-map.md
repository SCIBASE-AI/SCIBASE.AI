# Requirements Map

Issue #18 asks for a Scientific Bounty System with challenge posting, solver submissions, arbitration, reward distribution, payout routing, and IP management. This slice focuses on solver/team prequalification before private workspace access and multi-phase submission work.

| Issue area | Implementation |
| --- | --- |
| Challenge settings | `sample-data.js` models public/private challenges, NDA requirements, prize amount, team size, participation mode, timelines through availability thresholds, and scientific expertise requirements. |
| Pre-qualification rounds | `evaluateTeamForChallenge` checks skill fit, team capacity, identity attestation, NDA state, conflicts, workload, and anonymous-handle readiness. |
| Private challenge access | `workspaceAccess` returns `grant-private-workspace`, `hold-for-coordinator-review`, or `deny-until-remediated`. |
| Anonymous or named participation | Reviewer packets use an anonymous handle for anonymous challenges and named display for public challenges. |
| Audit logs | Every evaluation includes `auditDigest` and a signed `bounty.solver_prequalification.evaluated` event. |
| Arbitration readiness | Block/review findings are structured with evidence, enabling coordinator or arbitrator follow-up before submission scoring. |
| Trust on both sides | Sponsors get qualified candidates; solvers see remediation reasons before they invest in a challenge. |

## Non-overlap

This is distinct from existing or recent slices for challenge intake, scoring/arbitration, appeals, anti-collusion, escrow settlement, payout eligibility, sponsor reliability, amendment control, reviewer consensus, IP redaction, milestone progress, rubric readiness, and tamper-diff gates. It focuses specifically on deciding whether a solver team should enter a challenge workspace.
