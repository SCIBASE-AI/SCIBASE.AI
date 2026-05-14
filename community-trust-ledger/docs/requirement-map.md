# Requirement Map

| Issue #15 requirement | Implementation |
| --- | --- |
| Structured peer reviews | `normalizeReview()` scores clarity, rigor, novelty, and reproducibility with discipline and visibility metadata. |
| Public, semi-private, anonymous review modes | `normalizeReview()` preserves public summaries only for public reviews and hides restricted summaries. |
| Inline comments on project artifacts | `anchorInlineComment()` targets notebooks, datasets, code, or documents with path and selector metadata. |
| Contributor credits | `assignContributorCredits()` aggregates CRediT-style role points per contributor. |
| CRediT taxonomy support | Sample roles include software, validation, peer review, data curation, and writing. |
| Reputation scoring | `calculateReputation()` decomposes score into review, credit, endorsement, bounty, and reproducibility components. |
| Badges and incentive tiers | `awardBadges()` emits trusted reviewer, reproducibility mentor, and open science champion badges. |
| Leaderboards | `buildLeaderboard()` produces deterministic rank ordering. |
| Project timelines | `buildProjectTimeline()` combines peer reviews, inline comments, and credit events into one evidence stream. |
| Reviewer-friendly demo/API | `src/demo.js` prints the full report; `src/api.js` serves `/health` and `/demo-report`. |
| Tests | `test/trust-ledger.test.js` covers review scoring, comments, credits, reputation, badges, leaderboard, and report shape. |
