# Review Retaliation Guard

This contribution adds a focused guardrail for SCIBASE's Community & User Reputation System. It detects reputation actions that may punish a reviewer after an unfavorable manuscript review, freezes unsafe public reputation exports, and produces an evidence packet for independent moderation.

The slice is intentionally narrow: it does not build a full reputation system. It covers the trust gap between peer-review outcomes and reputation changes, where author-affiliated actors could downvote, remove badges, withdraw endorsements, or reduce profile visibility after a critical review.

## What It Checks

- Whether the underlying peer review is critical through recommendation, rating, tone, or criticality score.
- Whether a punitive reputation event targets the reviewer inside a configurable retaliation window.
- Whether the actor is affiliated with the manuscript, lab, institution, funder, or study team.
- Whether multiple affiliated actors create a clustered penalty burst.
- Whether messages contain coercive language asking the reviewer to soften or revise criticism.
- Whether public profile or leaderboard exports are still enabled while unresolved retaliation risk exists.
- Whether the reviewer has independent moderation and a meaningful appeal window before reputation deltas apply.

## Running Locally

```bash
npm test
npm run demo
npm run check
npm run video
```

The demo uses only synthetic sample packets in `data/sample_reputation_events.json`.

Generated files:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

The MP4 is generated from an FFmpeg color source and drawtext slate. It is not a screen recording and contains no desktop capture or private information.

## Why This Matters

Reputation systems can unintentionally chill rigorous peer review when negative reputation changes are allowed to follow critical reviews without context. A reviewer who recommends rejection should not lose badges, endorsements, public visibility, or leaderboard standing because authors or affiliated collaborators dislike the review outcome.

This guard gives SCIBASE an auditable path:

1. Freeze reputation deltas tied to the flagged review.
2. Preserve event evidence and coercive messages.
3. Require independent moderator review.
4. Notify the affected reviewer of appeal options.
5. Resume public reputation export only after resolution.
