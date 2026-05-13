# Requirement Map

| Issue #15 requirement | Implementation evidence |
| --- | --- |
| Structured peer reviews | `buildPeerReview` applies discipline templates and scoring dimensions. |
| Review modes | `resolveReviewVisibility` supports public, semi-private, blind, and double-blind modes. |
| Inline comments | `createInlineComment` anchors comments to document, dataset, code, or notebook targets. |
| Review history on profiles and timelines | `buildProjectTimeline` includes review events and author/reviewer actions. |
| Contributor credits | `recordContribution` creates timestamped contribution records. |
| CRediT taxonomy | `CREDIT_ROLES` and contribution role validation. |
| Contributor graph | `buildContributorGraph` returns nodes and weighted edges per project. |
| Reputation scoring | `calculateReputation` combines citations, forks, endorsements, review quality, reproducibility, bounties, and contribution diversity. |
| Badges and incentive tiers | `assignBadges` creates Trusted Reviewer, Reproducibility Steward, Open Science Champion, and Bounty Finisher badges. |
| Leaderboards | `buildLeaderboard` ranks users by domain, institution, and total reputation. |
