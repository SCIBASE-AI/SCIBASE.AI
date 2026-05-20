# Partner Royalty Settlement Guard

Self-contained Revenue Infrastructure slice for issue #20. It focuses on a narrow gap that is different from the existing subscription, metering, tax, dispute, SLA, procurement, pricing experiment, renewal, margin, and privacy-gate modules: audit-ready settlement of data-licensing and white-label analytics revenue shares.

The guard evaluates each license invoice before money is released to dataset contributors, reseller partners, and the platform.

## What It Does

- Calculates platform fees, reseller fees, contributor royalty pools, reserves, and payable lines.
- Blocks duplicate invoices, expired agreements, unauthorized use cases, missing consent attestations, excessive reseller fees, and broken royalty split percentages.
- Holds otherwise-valid settlements when anonymized subject counts are below the configured aggregation floor or payout lines are below the minimum payout threshold.
- Produces a deterministic SHA-256 audit digest that finance can archive with the invoice packet.
- Returns reviewer-ready actions for settlement, hold, and blocker states.

## Files

- `index.js` - dependency-free settlement evaluator.
- `test.js` - Node assertions covering ready, held, blocked, duplicate, and validation paths.
- `demo.js` - terminal demo over a synthetic license batch.
- `requirements-map.md` - explicit mapping to issue #20 requirements.
- `acceptance-notes.md` - verification notes and limitations.
- `demo.svg` / `demo.mp4` - short visual demo artifacts for bounty review.

## Run

```bash
node partner-royalty-settlement-guard/test.js
node partner-royalty-settlement-guard/demo.js
```

## Example Output

```text
Partner Royalty Settlement Guard Demo
=====================================
settlements: 3
ready: 1, held: 1, blocked: 1
ready payouts: $925.00
held payouts: $232.56
blocked gross: $640.00
```

## Design Notes

The module is synthetic-data-only and has no network, payment, Stripe, PayPal, bank, or credential integration. It is intended to be the policy and audit layer that would run before a real payout provider is called.
