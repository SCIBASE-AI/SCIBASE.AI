# Requirement Map for SCIBASE Issue #18

Issue #18 asks for a Scientific Bounty System with challenge posting, secure submissions, arbitration, reward distribution, payout routing, IP controls, and trust on both sides of the marketplace.

This contribution implements a focused risk-control slice that can sit between submission evaluation and payout.

| Issue requirement | Implemented here |
| --- | --- |
| Challenge posting portal with evaluation criteria | `sample-data.json` models a challenge with sponsor, prize pool, payout policy, and IP policy metadata. |
| Submission engine with standardized deliverables | Submissions include titles, abstracts, methods, deliverable manifests, timestamps, anonymized network IDs, and artifact hashes. |
| Submission package validation | `compareSubmissions` checks shared artifact hashes and near-duplicate method/deliverable text before payout. |
| Arbitration and third-party review | `evaluateAssignments` checks reviewer and arbitrator conflicts before their review can drive payout decisions. |
| Reward distribution and payout routing | `payoutDecisionForSubmission` returns `release-ready`, `manual-review`, or `hold-for-arbitration` decisions with reasons. |
| IP management options | The sample challenge carries `ipPolicy`, and payout holds prevent unsafe release before conflicts or duplicates are resolved. |
| Trust on both sides | Findings separate high-severity conflicts from softer timing/network signals so sponsors, solvers, and reviewers get auditable decisions. |
| Reviewer-ready evidence | `analyzeScientificBountyRisk` emits duplicate findings, conflict findings, timing findings, payout decisions, arbitration queue, content fingerprints, and an audit digest. |
| Local verification | `npm run check`, `npm test`, and `npm run demo` run without credentials, services, or external dependencies. |

## Non-goals

- No real identity, payment, or wallet data is processed.
- No live sponsor, reviewer, or solver accounts are required.
- No external fraud-scoring service or ML model is added.
- No private IP or undisclosed research data is committed.
