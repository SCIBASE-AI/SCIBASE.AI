# Reputation Leaderboard Eligibility Guard

This module is a focused Community and User Reputation System slice for issue #15. It validates whether a domain, regional, or institutional reputation leaderboard can publish without amplifying weak or gamed reputation signals.

The guard checks:

- minimum evidence diversity for each ranked researcher
- pending appeals and moderation holds
- anonymous review privacy before publishing reviewer-derived signals
- reciprocal endorsement concentration
- institution-level dominance in regional or domain boards
- stale reproducibility badges
- minimum accepted peer-review and contribution evidence

It uses only Node.js built-ins and synthetic data.

## Run

```bash
node reputation-leaderboard-eligibility-guard/test.js
node reputation-leaderboard-eligibility-guard/demo.js
```

The demo writes reviewer artifacts to `reputation-leaderboard-eligibility-guard/reports/`.
