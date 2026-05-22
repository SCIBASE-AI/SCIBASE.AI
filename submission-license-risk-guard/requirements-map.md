# Requirements Map

Issue #18 asks for a Scientific Bounty System covering challenge posting, submission packages, arbitration, reward distribution, and IP management. This slice maps to the submission and arbitration preflight layer.

| Issue capability | Covered by this slice |
| --- | --- |
| Submission package builder | Validates a submitted deliverable manifest before sponsor/reviewer access. |
| Secure private project submissions | Flags restricted datasets, controlled artifacts, and role-specific access blockers before review. |
| Evaluation dashboard readiness | Emits reviewer packets with blockers, warnings, and remediation owners. |
| Arbitration checklists | Produces deterministic audit evidence for license, dependency, and redistribution risk. |
| IP management options | Checks code/data/model license terms and redistribution limits before acceptance. |
| Sponsor trust | Blocks packages with incompatible licenses, critical vulnerable dependencies, missing notices, or undeclared export-sensitive content. |

## Non-Overlap

This is separate from the existing intake, rubric readiness, workspace privacy, prequalification, arbitration/scoring, appeals, anti-collusion, escrow settlement, payout eligibility, sponsor reliability, amendment-control, reviewer consensus, IP redaction, milestone progress, evidence freeze, data-room access, clarification freeze, award transparency, benchmark leakage, deliverable acceptance, reproducibility environment, and cancellation/no-award submissions.
