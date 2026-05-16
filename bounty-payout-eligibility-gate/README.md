# Bounty Payout Eligibility Gate

Dependency-free Scientific Bounty System module that evaluates whether a solver team can safely move from reward decision to payout settlement.

This slice focuses on payout eligibility and compliance readiness, which is separate from challenge intake, scoring, arbitration, appeals, anti-collusion, escrow settlement, sponsor reliability, and amendment consent modules.

## What it does

- Checks contributor identity attestations and supported payout countries.
- Validates payout method, tax form, and institution routing evidence.
- Flags sanctions/watchlist risk and unresolved compliance notes.
- Keeps IP release blocked until the team is eligible and settlement is funded.
- Produces sponsor-facing remediation actions by contributor.
- Emits a signed audit packet for payout review.

All examples are synthetic and no external services, credentials, or personal data are required.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo reads `sample-data.json` and prints a deterministic settlement readiness packet.

## Demo Video

`docs/demo.mp4` is a short H.264 walkthrough artifact generated from `docs/demo.svg`.
