# Revenue Entitlement Delivery Guard

This contribution adds a focused guard for SCIBASE's Revenue Infrastructure layer. It checks whether a signed subscription, compute, API, or data-licensing contract has actually been provisioned before billing, renewal, expansion, or revenue-recognition workflows treat the account as delivered.

The slice is intentionally narrow. It does not replace pricing, checkout, metering, tax, FX, dunning, subscription-renewal notices, quota rollover, dispute evidence, grant budgets, privacy-safe licensing, or revenue-recognition close controls. It covers the delivery-evidence boundary between commercial contract lines and platform entitlements.

## What It Checks

- Contract term dates align with active billing.
- Delivery evidence hash and customer acceptance are present.
- Purchased seat counts match provisioned user entitlements.
- Purchased API, compute, and storage quotas match provisioned limits.
- Purchased analytics or data feeds are enabled, and unpurchased feeds are not accidentally exposed.
- Support tier, SLA, and account-owner acknowledgement match the contract.
- Revenue recognition is held when delivery findings are unresolved.
- Deterministic reviewer packets explain `RELEASE_REVENUE`, `REVIEW_REVENUE`, or `HOLD_REVENUE` decisions.

## Running Locally

```bash
npm test
npm run demo
npm run check
npm run video
```

The demo uses only synthetic contract packets in `data/sample_entitlement_delivery_packets.json`.

Generated files:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

The MP4 is generated from an FFmpeg color source and drawtext slate. It is not a screen recording and contains no desktop capture or private information.

## Why This Matters

Revenue infrastructure is not only about collecting money. Institutional customers need the access, quotas, support, and licensed feeds they bought, while SCIBASE needs a clean record that delivery happened before finance systems recognize the account as complete.

This guard gives finance and platform reviewers a deterministic packet to catch under-delivery, accidental over-entitlement, missing evidence, and unsafe revenue-recognition states before invoices, renewals, and reporting workflows move forward.
