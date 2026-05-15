# Requirement Map

This module contributes a focused dispute-handling slice for SCIBASE issue #18: Scientific Bounty System.

| Issue #18 requirement | Evidence in this module |
| --- | --- |
| Platform-mediated arbitration system | `buildAppealsLedger` creates a deterministic ledger for post-evaluation appeals, eligibility, reviewer conflicts, SLA state, and next actions. |
| Automated checklists for deliverables | `evaluateEvidenceLock` checks whether contested submissions have complete locked artifact hashes before arbitration proceeds. |
| Optional third-party reviewers or peer validators | `evaluateReviewerConflicts` identifies when a sponsor-affiliated reviewer must be replaced by an independent reviewer. |
| Feedback loop between submitters and sponsors | `buildSponsorFeedbackPacket` summarizes open appeals, overdue responses, conflict reviews, and requested sponsor actions. |
| Escrowed prize funds | `summarizePayouts` separates held and releasable award amounts while an eligible appeal remains open. |
| Partial payments or honorable mentions | The sample challenge covers both a winning award and an honorable-mention payout route. |
| Payout routing | `evaluatePayoutHold` keeps awarded submission routes intact while holding/releasing funds based on appeal state. |
| IP transfer upon payout | `evaluateIpGuard` blocks IP transfer while payout is held by an eligible appeal. |
| Auditability | `buildAuditTrail` emits decision, appeal-window, response-due, payout-hold, and payout-summary events with a stable digest. |
| Reviewer demo | `npm run demo` prints appeal count, payout hold amount, top action, IP guard count, and digest; `docs/demo.mp4` is a short visual demo artifact. |
