# Requirement Map

This module addresses SCIBASE issue #18 by implementing a focused challenge posting and intake compliance gate.

| Issue requirement | Implementation evidence |
| --- | --- |
| Challenge posting portal | `sampleChallenges` models sponsor, vertical, visibility, problem statement, deliverables, rubric, milestones, prize, NDA, prequalification, IP policy, and timeline. |
| Problem description and scientific context | `validateChallenge()` blocks challenges missing summary, scientific context, or target outcome. |
| Deliverables | Deliverables are typed and validated; at least two required deliverables are required for scientific review. |
| Evaluation criteria and scoring rubric | Rubric criteria include weights and descriptions; `validateChallenge()` requires weights to total 100. |
| Timeline and milestone deadlines | Milestones include due offsets, required artifacts, and payout percentages; timeline close date must follow open date. |
| Prize amount and payout schedule | Prize amount, escrow requirement, escrow status, honorable mentions, and milestone payout totals are checked. |
| Public vs. private challenges | Visibility is validated and combined with NDA/data-room warnings. |
| Prequalification rounds | `scoreParticipantApplication()` evaluates ORCID, institution, domain experience, conflict disclosure, NDA, and prior completions. |
| NDA support | NDA templates and reviewer access are represented; missing NDA templates block sensitive challenges. |
| IP management options | IP policy mode, fallback license, embargo, and solver-retains-IP-until-paid are validated. |
| Arbitration/reward readiness dependency | The publish gate prevents invalid sponsor-side setup before downstream arbitration and payout workflows begin. |
| Reviewer-ready local demo | `src/server.js` exposes dashboard, validation, publish-decision, prequalification, and audit-packet endpoints. |
| Tests passing | `test/intake-gate.test.js` covers publish readiness, blockers, application scoring, dashboard, audit packet, and IP safety. |

## Differentiation From Existing #18 PRs

Most existing #18 submissions focus on arbitration, scoring, reward routing, or lifecycle ledgers. This module focuses earlier in the workflow: sponsor challenge intake before a bounty is published. It reduces rework by catching incomplete problem statements, weak rubrics, unfunded escrow, NDA gaps, unsafe IP terms, and unqualified applicants before teams start work.
