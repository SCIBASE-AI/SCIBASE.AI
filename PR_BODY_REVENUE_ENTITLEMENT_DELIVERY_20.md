/claim #20

## Summary

Adds `revenue-entitlement-delivery-guard/`, a focused Revenue Infrastructure guard for contract-to-entitlement delivery evidence.

This is distinct from existing #20 slices for broad billing modules, subscriptions, renewal notices, dunning holds, tax/FX, quota rollover, metering, payment disputes, grant budgets, privacy-safe licensing, analytics-seat rosters, data-product freshness, and revenue-recognition close controls. It focuses only on whether signed customer contract lines have been provisioned as seats, quotas, data feeds, support tiers, and delivery evidence before billing, renewal, expansion, or revenue-recognition workflows proceed.

## What is included

- Dependency-free Node evaluator.
- Synthetic contract and entitlement-delivery packets.
- Deterministic `RELEASE_REVENUE`, `REVIEW_REVENUE`, and `HOLD_REVENUE` decisions.
- Checks for contract term dates, delivery evidence hash, customer acceptance, account-owner acknowledgement, under-delivered seats/quotas/feeds/support, over-provisioned entitlements, unpurchased data feeds, and missing revenue holds.
- Reviewer artifacts:
  - `reports/summary.json`
  - `reports/reviewer-packet.md`
  - `reports/summary.svg`
  - `reports/demo.mp4`

## Validation

Locally verified:

```text
npm.cmd test
npm.cmd run demo
npm.cmd run check
npm.cmd run video
git diff --check
confirmed reports/demo.mp4 was generated as a non-empty local artifact
```

The MP4 demo is an FFmpeg-generated synthetic slate only. It is not a screen recording and contains no desktop capture, credentials, private files, or personal information.

AI-assisted with OpenAI Codex; I reviewed and locally verified the implementation before submitting.
