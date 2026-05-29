# Reputation Review-Abuse Guard

This module adds a focused moderation layer for the Community & User Reputation System. It decides whether peer-review activity should count toward reputation and leaderboard updates.

It is intentionally separate from broad reputation scoring, contributor credit graphs, review templates, profile dashboards, badge systems, and leaderboards. This guard only handles abuse and conflict signals around review-derived reputation credit.

## What It Checks

- Shared-affiliation conflicts between reviewer and target author
- Reciprocal review links
- High reputation deltas from low-effort review text
- Anonymous-review identity leakage
- Endorsement-cluster farming signals
- Deterministic count, hold, and moderation actions

## Demo

Run:

```bash
node reputation-review-abuse-guard/test.js
node reputation-review-abuse-guard/demo.js
node reputation-review-abuse-guard/render-video.js
```

Generated artifacts:

- `reports/review-abuse-report.json`
- `reports/review-abuse-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call identity providers, private user profiles, live reputation ledgers, payment systems, credentials, or SCIBASE production services.
