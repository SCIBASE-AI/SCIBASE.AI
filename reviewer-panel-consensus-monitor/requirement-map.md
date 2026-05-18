# Requirement Map: SCIBASE-AI/SCIBASE.AI#18

Issue #18 describes a scientific bounty marketplace with challenge posting, secure submissions, arbitration, and reward distribution. This contribution focuses on the arbitration and reviewer validation layer.

## Challenge Posting Portal

- Supports rubric version checks through `rubric.version`.
- Uses `rubric.criteria`, `decisionThreshold`, and `maxScoreVariance` to make evaluation criteria explicit before review.
- Preserves the review `phase` so multi-stage challenge decisions can be audited.

## Submission Engine

- Requires submission package evidence through `submission.artifactHashes`.
- Flags missing `manifestLockedAt` timestamps so reviewers cannot score mutable deliverables.
- Includes `submissionId` and `teamId` in the arbitration packet for standardized challenge submission records.

## Arbitration & Reward Distribution

- Detects reviewer conflicts and recommends replacing or quarantining conflicted scores.
- Requires at least two unconflicted independent reviewers with expertise tags.
- Computes reviewer average score and score spread against the rubric variance limit.
- Requires feedback and decision explanations before sponsor payout action.
- Emits `panelDecision` values of `approve`, `needs-arbitration`, or `block`.
- Produces a deterministic `sha256:` digest for the review packet.

## IP And Payout Safety

- Holds award/phase advancement when evidence is unlocked, conflicted, or under-explained.
- Produces required actions that sponsors or arbitrators can complete before reward distribution.
- Keeps the module dependency-free and synthetic-data-only; no payout action, credential access, or external service call is performed.
