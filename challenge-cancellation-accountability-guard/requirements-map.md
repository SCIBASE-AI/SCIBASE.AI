# Requirements Map

Issue #18 asks for a Scientific Bounty System with challenge posting, submission handling, arbitration/reward distribution, milestone payout routing, IP options, and repeatable review evidence.

This slice covers the post-start cancellation/no-award branch of that lifecycle:

| Issue capability | Coverage in this PR |
| --- | --- |
| Arbitration and reward distribution | Creates cancellation/no-award hold decisions before funds or IP move. |
| Escrowed prize funds | Blocks refunds before appeal and compensation controls are satisfied. |
| Partial payments for milestones or honorable mentions | Calculates a partial-work compensation floor and shortfall. |
| Feedback loop between submitters and sponsors | Requires solver notification coverage before close. |
| IP management options | Keeps solver IP retained until settlement/no-award close is safe. |
| Audit logs for reproducibility | Emits deterministic JSON, Markdown, SVG, and digest artifacts. |
| Standardized evaluation dashboard | Produces per-challenge close/hold summaries and finding codes. |

## Non-overlap

This is not another intake, rubric readiness, submission privacy, prequalification, scoring, appeal, anti-collusion, escrow settlement, payout eligibility, sponsor reliability, amendment consent, reviewer consensus, IP redaction, milestone progress, evidence freeze, data-room access, clarification freeze, award transparency, or benchmark leakage module. It focuses on sponsor cancellation/no-award accountability after solver work has already started.
