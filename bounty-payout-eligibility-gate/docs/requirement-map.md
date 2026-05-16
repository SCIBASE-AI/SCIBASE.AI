# Requirement Map

This module maps to issue #18, Scientific Bounty System.

| Issue capability | Implementation |
| --- | --- |
| Reward distribution | Builds contributor-level payout plan from award splits and bounty amount. |
| Payout routing | Checks payout method evidence, country support, tax form status, and institution routing approval. |
| Escrowed prize funds | Blocks settlement if sponsor funds are not confirmed. |
| Team and institution payouts | Supports contributor splits plus institution approval holds. |
| IP management options | Keeps IP release blocked until payout eligibility and funding are ready. |
| Platform-mediated arbitration | Emits signed audit packets and sponsor-facing remediation actions for payout review. |
| Secure solver participation | Flags identity attestation and watchlist review blockers before funds move. |

## Acceptance Evidence

- `npm run check`
- `npm test`
- `npm run demo`
- `docs/demo.mp4`
