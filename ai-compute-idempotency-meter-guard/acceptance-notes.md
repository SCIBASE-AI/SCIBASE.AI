# Acceptance Notes

## Scope

The guard handles three concrete Revenue Infrastructure risks:

1. Retry double-billing when an AI tool call is retried under a new request ID.
2. Raw-count inflation when many cache hits or repeated events map to one distinct account/source/day attribution unit.
3. Nondeterministic reproducibility reruns without an explicit policy for billing the run versus billing the verified output.
4. Account-level invoice release decisions after included quota and prepaid top-up balances are applied.

## Non-Goals

- No live Stripe, PayPal, bank, wallet, or tax integration.
- No private project content.
- No external network calls.
- No account identity or KYC handling.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts into `reports/`. The submitted review packet includes a short H.264 demo video at `reports/demo.mp4`.
