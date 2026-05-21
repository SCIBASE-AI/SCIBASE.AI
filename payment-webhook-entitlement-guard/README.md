# Payment Webhook Entitlement Guard

This module is a focused revenue-infrastructure slice for issue #20. It protects the exact activation point where paid orders, AI compute top-ups, lab seats, and institutional subscriptions become usable after payment webhooks arrive.

It is intentionally not another generic billing ledger. The guard checks webhook streams before granting entitlements:

- duplicate provider event IDs
- invalid or stale signatures
- test-mode payment events
- missing order references
- amount or currency mismatches
- out-of-order lifecycle events
- duplicate entitlement grants
- refund, dispute, or payment reversal events

The output is a deterministic finance packet with blockers, warnings, activation candidates, reversal actions, and a release recommendation.

## Run

```bash
node payment-webhook-entitlement-guard/test.js
node payment-webhook-entitlement-guard/demo.js
```

The demo writes:

- `reports/webhook-entitlement-packet.json`
- `reports/webhook-entitlement-report.md`
- `reports/summary.svg`
- `reports/summary.png`
- `reports/demo.mp4`

## Design Notes

- Dependency-free Node.js core logic.
- Synthetic data only. No live payment credentials.
- Supports Stripe, PayPal, and institutional invoice event streams.
- Entitlements are withheld whenever blockers exist.
