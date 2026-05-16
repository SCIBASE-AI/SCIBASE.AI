# Requirement Map

Issue #18 describes a global research marketplace that needs sponsor challenge posting, secure participation, evaluation, arbitration, reward distribution, and IP options. This module adds a pre-commitment trust layer for solvers.

## Mapping To Issue #18

| Issue #18 area | Scorecard coverage |
| --- | --- |
| Challenge posting portal | Checks prize funding proof, timelines, rubric completeness, milestone schedule, NDA status, and IP term clarity before a challenge is marked solver-ready. |
| Evaluation criteria and scoring rubric | Scores whether criteria are measurable, weighted, evidence-backed, and include tie-break protocols. |
| Timeline and milestone deadlines | Flags missing review SLAs, unrealistic timelines, and absent sponsor-response windows. |
| Public vs private challenges and NDA support | Rates whether private challenges provide clear NDA scope and non-sensitive public summaries. |
| Submission engine trust | Gives solvers a readiness signal before creating a secure workspace or uploading private work. |
| Arbitration and reward distribution | Uses sponsor payout and dispute history as pre-commitment risk signals, without duplicating arbitration or escrow-settlement logic. |
| IP management options | Blocks or warns when IP transfer can occur before payment or when terms are missing. |

## Non-Overlap

This is not another intake gate, rubric scorer, arbitration ledger, appeals ledger, escrow settlement ledger, reproducibility audit, workspace privacy gate, anti-collusion module, or amendment-control engine. It sits before solver commitment and answers: "Is this sponsor and challenge reliable enough to spend research time on?"

## References Reviewed

- GSA Prize and Challenge Toolkit: emphasizes measurable evaluation criteria, transparent judging protocols, conflict/NDA management, and clear prize procedures.
- GSA prize competitions overview: distinguishes prize competitions from contracts/grants and describes the announce, submit, review, and award flow.
- Nesta Challenge Prizes practice guide: highlights careful prize construction, incentives, support, and attracting the right talent.

## Acceptance Signals

- Deterministic scorecards with no external service dependency.
- Clear trust tiers: `trusted`, `watch`, `hold`.
- Sponsor action list that can move a challenge toward solver readiness.
- Public-safe audit digest that redacts sensitive sponsor notes and payment/KYC fields.
- Tests for trusted, watch, and hold paths plus digest determinism and privacy redaction.
