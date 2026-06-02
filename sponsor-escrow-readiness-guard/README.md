# Sponsor Escrow Readiness Guard

This module adds a focused Scientific Bounty System guard for sponsor-side prize funding before a challenge is opened for solver submissions.

It evaluates synthetic challenge funding packets for:

- missing escrow or funding evidence
- underfunded prize pools
- payout schedules that do not reconcile to the prize amount
- funding evidence that expires before the challenge award window
- missing sponsor authorization for prize release
- milestone schedules that omit solver-safe partial payment routing

The output is deterministic and reviewer-ready: `release`, `revise`, or `hold`, plus remediation text for each finding.

## Run

```bash
npm test
npm run demo
npm run demo:video
```

Generated artifacts are written to `reports/`.

## Safety

The sample packets are synthetic. The module does not call external services and does not use credentials, wallets, bank accounts, live escrow providers, payment processors, private challenge data, or production payout systems.
