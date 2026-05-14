# Requirement Map

| Issue #18 theme | Implementation |
| --- | --- |
| Challenge posting | `normalizeChallenge` validates title, criteria, milestones, budget, deliverables, and IP policy. |
| Deliverable rubrics | Weighted criteria are aggregated by `scoreSubmission`. |
| Team submissions | `normalizeSubmission` supports contributors, affiliations, evidence manifests, and declared relationships. |
| Package manifests | `validateEvidenceManifest` checks repository, reproducibility, demo, data/code, and license evidence. |
| Arbitration workflow | `buildDecision` triggers arbitration when reviewer spread is too high or conflicts are unresolved. |
| Milestone/prize routing | `buildPayoutReadiness` maps award recommendations to milestone budgets and payout blockers. |
| IP terms | `buildAcceptanceRecord` records explicit IP transfer status and required acceptance language. |
| Reviewer dashboard | `evaluateBountySubmission` returns a single report with scores, conflicts, risks, decision, and payout state. |

## Verification Commands

```bash
npm test
npm run demo
```
