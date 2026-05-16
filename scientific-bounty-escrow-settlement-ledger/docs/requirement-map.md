# Scientific Bounty Escrow Settlement Requirement Map

| Issue #18 capability | Implementation evidence |
| --- | --- |
| Escrowed prize funds | `evaluateChallenge()` compares approved awards with cleared sponsor escrow and blocks underfunded settlements. |
| Partial payments for milestones and honorable mentions | Sample data includes proposal, prototype, grand prize, and honorable mention awards; payable milestones become settlement packets. |
| Payout routing for individuals, teams, and institutions | `evaluateRoutes()` validates basis points and calculates institution and individual payee amounts. |
| IP retained until paid or opened after award | `determineIpReleaseState()` locks IP during funding gaps or holds and releases only after ready settlement. |
| Arbitration and feedback handoff | The module consumes approved milestone decisions and appeal/dispute status without reimplementing scoring or arbitration. |
| Trust and auditability | `signLedgerEvent()` and packet digests produce deterministic settlement evidence for webhook or audit trails. |
| Reviewer-ready proof | `npm run check`, `npm test`, `npm run demo`, `docs/demo.svg`, and `docs/demo.gif` provide local verification and a short demo artifact. |

## Non-overlap Notes

This slice focuses on post-decision escrow settlement. It does not duplicate challenge intake, challenge lifecycle, scoring/arbitration, appeals, workspace privacy, or anti-collusion modules already submitted for issue #18.
