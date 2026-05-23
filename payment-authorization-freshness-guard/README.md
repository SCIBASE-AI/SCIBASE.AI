# Payment Authorization Freshness Guard

Self-contained SCIBASE issue #20 slice for Revenue Infrastructure.

The guard reviews saved payment instruments and customer authorizations before subscription renewals, AI compute top-ups, analytics license renewals, or institutional auto-pay charges are attempted.

## Checks

- Expired saved card instruments.
- Stale SCA/3DS card mandates.
- Missing ACH or direct-debit authorization evidence.
- Mandate scope mismatches for revenue streams.
- Missing autopay consent.
- Amount variance above the authorized threshold without customer notice.
- Currency variance without customer notice or reauthorization.

## Artifacts

Run:

```bash
npm run demo
npm run video
```

Generated reviewer artifacts are written to `reports/`:

- `payment-authorization-packet.json`
- `payment-authorization-report.md`
- `summary.svg`
- `demo.mp4`

## Safety

Synthetic data only. No live customer data, payment processors, card numbers, bank details, credentials, external APIs, payment movement, payout systems, or network calls are used.
