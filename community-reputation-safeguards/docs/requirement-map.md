# Issue #15 Requirement Map

| Issue #15 requirement | Implementation |
| --- | --- |
| Structured peer reviews | `redactReview()` preserves scores, summaries, review modes, and timeline fields for structured reviews. |
| Review modes | Public, semi-private, anonymous, and double-blind modes map to explicit visibility states. |
| Inline comments | `redactComment()` anchors comments to document, dataset, code, notebook, path, and line/cell ranges. |
| Review history | `buildTimeline()` orders review, contribution, and inline-comment events for project timelines. |
| Contributor credits | `buildContributionGraph()` timestamps project contributions and stores CRediT roles. |
| CRediT taxonomy support | The module validates and aggregates CRediT-style roles such as data curation, formal analysis, software, and validation. |
| Reputation scoring | `computeReputation()` combines citations, forks, endorsements, review quality, reproducibility badges, bounties, challenge wins, and contributions. |
| Abuse resistance | `detectAbuseSignals()` flags self-endorsements, reciprocal loops, conflicts of interest, and low-evidence reviews. |
| Leaderboards | `buildLeaderboards()` creates global, domain, region, and institution rankings. |
| Badge system and incentive tiers | `assignBadges()` and `tierFor()` emit badges such as Trusted Reviewer, Open Science Champion, Domain Leader, and Reputation Watch. |
| Demo and tests | `scripts/demo.js`, `docs/demo.svg`, `docs/demo.mp4`, and `test/reputation-safeguards.test.js` provide reviewer-ready validation. |

This slice is deliberately focused on privacy and trust safeguards so it can complement broader community UI or social graph implementations.
