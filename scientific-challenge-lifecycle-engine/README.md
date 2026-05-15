# Scientific Challenge Lifecycle Engine

Self-contained MVP module for issue #18, **Scientific Bounty System**. It models the full challenge-to-award lifecycle without external services or runtime dependencies, so reviewers can validate the core domain rules with one command.

## What It Covers

- Challenge posting metadata: scientific context, vertical templates, visibility, NDA settings, rubric, timeline, prize, and IP policy.
- Submission package builder: deliverable manifests, artifact checksums, reproducibility evidence, missing required deliverables, and audit hashes.
- Arbitration workflow: reviewer conflict detection, weighted rubric scoring, threshold checks, and blocking reasons.
- Reward distribution: escrow checks, milestone payout schedule, partial/final milestone readiness, and payout currency.
- IP management: solver-retains-until-paid, sponsored-transfer, open-license, and custom license handoff states.
- Demo path: fixture-driven CLI that prints award readiness, payout schedule, and IP handoff status.

## Run

```bash
npm run check
```

That runs:

```bash
npm test
npm run demo
```

Expected demo shape:

```json
{
  "challenge": "challenge-biomarker-001",
  "submission": "submission-lab-42",
  "status": "award_ready",
  "finalScore": 90.05,
  "payoutReady": true
}
```

## Requirement Map

| Issue #18 requirement | Implementation evidence |
| --- | --- |
| Challenge posting portal with scientific context, deliverables, evaluation rubric, timelines, prize, and payout schedule | `normalizeChallenge()` validates required fields and rubric weights; sample challenge includes biotech context, deliverables, milestones, and prize schedule. |
| Public/private challenges, pre-qualification, NDA support, and R&D vertical templates | Challenge fields include `visibility`, `qualification`, `ndaRequired`, and `vertical`; templates are mapped in `DEFAULT_VERTICAL_TEMPLATES`. |
| Secure project/submission space with versioned deliverables and audit logs | `createSubmissionPackage()` builds artifact manifests, stable SHA-256 hashes, coverage summaries, reproducibility evidence, and package audit hashes. |
| Submission package builder with standardized deliverable manifest | `artifactManifest`, `deliverableCoverage`, `missingRequired`, and `reproducibility` are emitted for each submission. |
| Multi-phase challenges | Deliverables carry `phase`; `buildPayoutPlan()` evaluates prototype and final milestone readiness separately. |
| Arbitration with automated deliverable checks, reviewers, feedback/conflict handling | `detectReviewerConflicts()` flags submitter, sponsor, institutional, and recent-collaborator conflicts; `scoreSubmission()` computes weighted rubric scores. |
| Escrowed prize funds and payout routing | `buildPayoutPlan()` blocks payment when prize is not escrowed and creates milestone payout schedule amounts. |
| Partial milestone payments and honorable/alternate awards | Milestone schedule is data-driven; fixture uses 25% prototype and 75% final payouts. |
| IP transfer or open licensing based on challenge terms | `resolveIpHandoff()` handles sponsored transfer, solver-retains-until-paid, open license, and custom terms. |

## Files

- `src/index.js` - domain engine and exported functions.
- `src/cli.js` - reviewer demo command.
- `sample/biomarker-challenge.json` - full challenge, submission, reviewers, and review scores.
- `test/challenge-lifecycle.test.js` - regression tests for validation, packaging, conflicts, scoring, payout readiness, and IP states.
- `docs/demo.svg` - lightweight visual walkthrough for PR review.
- `docs/demo.mp4` - short generated video walkthrough for maintainers who prefer an inline demo artifact.

## Notes

This is dependency-free and credential-free. It is designed as a mergeable foundation for a future web UI, persistence layer, payment provider adapter, and sandbox execution service.
