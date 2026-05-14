# Requirement Map

This module addresses SCIBASE issue #15 by adding a focused trust and safety layer for community reputation.

| Issue requirement | Implementation evidence |
| --- | --- |
| Structured peer reviews | Sample reviews include discipline-style scores for clarity, rigor, novelty, and reproducibility; `computeReviewQuality()` evaluates review quality. |
| Inline comments on artifacts | Sample comments target datasets and notebooks with public or double-blind modes. |
| Public, semi-private, anonymous, and double-blind modes | Review and comment samples include public, semi-private, anonymous, and double-blind modes; `detectAnonymousSafetyIssues()` audits blind-review safety. |
| Review history and project timelines | Reviews, comments, endorsements, and contribution events are timestamped and tied to projects/users. |
| Contributor credits and CRediT roles | `contributionEvents` model verified CRediT-style contribution roles such as Data Curation and Review. |
| Reputation scoring | `computeReputationAdjustments()` combines base reputation, review quality bonuses, abuse penalties, and transparent reason codes. |
| Endorsements | `detectEndorsementRings()` detects rapid reciprocal endorsements before they inflate reputation. |
| Badges and incentive tiers | `evaluateBadgeQuarantine()` freezes badges that fail guardrail thresholds and lists currently eligible badges. |
| Leaderboard trust protection | Reputation adjustments and badge quarantine outputs can be used before ranking users by domain, region, or institution. |
| Abuse-resistant moderation | `buildAbuseReport()` flags review-rate anomalies, low-quality bursts, endorsement rings, and anonymous-review safety problems. |
| Appeals and transparency | `buildAppealPacket()` links findings to a user appeal; `buildTransparencyReport()` exports public guardrail outcomes. |
| Reviewer-ready local demo | `src/server.js`, tests, README commands, and `demo/demo-text.txt` expose reproducible local API validation. |

## Differentiation From Existing #15 PRs

Existing #15 submissions mostly implement broad peer review, comments, reputation scoring, leaderboards, badges, or privacy safeguards. This module focuses on the operational guardrail layer that keeps those systems trustworthy: suspicious activity detection, endorsement-ring prevention, badge quarantine, appeals, and moderator queue evidence.
