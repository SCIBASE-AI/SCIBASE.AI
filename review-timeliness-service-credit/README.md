# Review Timeliness Service-Credit Guard

This focused slice adds a review timeliness and service-credit guard for the Community & User Reputation System in issue #15.

The module converts structured peer-review history into transparent service-credit deltas while holding risky reputation changes for moderator review.

## What it checks

- On-time delivery versus overdue reviews.
- Approved extension grace without hiding lateness.
- Actionable comment density.
- Evidence-link coverage for factual critiques.
- Blind-review privacy holds.
- Leaderboard readiness and moderator action packets.
- A transparency receipt that excludes prestige and private notes from reputation scoring.

## Run it

```bash
node review-timeliness-service-credit/test.js
node review-timeliness-service-credit/demo.js
```

Generated JSON, Markdown, SVG, and `demo.webm` outputs live in `review-timeliness-service-credit/reports/`.

## Why this is distinct

This is not another broad reputation ledger, endorsement ring guard, mentorship ladder, correction-impact ledger, credit attestation, peer-review calibration module, reviewer COI module, transparency receipt ledger, abuse/appeals detector, dataset curation credit ledger, or reproducibility badge renewal guard. It focuses specifically on peer-review service timing, usefulness, privacy, and transparent service-credit readiness.
