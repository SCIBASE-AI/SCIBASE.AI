# Scientific Bounty Escrow Settlement Ledger

Scientific bounty marketplaces need payout controls after a challenge has been scored or arbitrated. This module evaluates sponsor escrow, payable milestones, team payout routes, dispute holds, and IP release state before settlement packets are generated.

## What It Covers

- Sponsor-funded escrow coverage checks for approved scientific bounty awards.
- Milestone, grand prize, and honorable mention settlement readiness.
- Payout routing across institutions and individual solver team members.
- Appeal/dispute holds that keep funds and IP release locked.
- Deterministic settlement packet digests and signed ledger events.
- Synthetic sample data only; no credentials, banking details, or real payout data.

## Run It

```bash
npm run check
npm test
npm run demo
```

## Demo Output

```text
Scientific bounty escrow settlement demo for SCIBASE Scientific Bounty Market
As of 2026-05-16: 1 ready, 1 held, 1 blocked
Payable now: $30000; held: $2500; shortfall: $3000
challenge-biomarker-rna: ready payable=$30000 shortfall=$0 ip=transfer_after_settlement
challenge-regional-forecast: blocked payable=$12000 shortfall=$3000 ip=locked_pending_funding_or_routes
challenge-quantum-noise: held payable=$2500 shortfall=$0 ip=locked_pending_hold_resolution
Settlement packets: 2
Signed event sample: challenge-biomarker-rna digest=... signature=...
```

## Files

- `src/escrow-settlement-ledger.js` - dependency-free escrow and settlement evaluator.
- `data/sample-escrow-book.json` - synthetic sponsors, challenges, awards, and payout routes.
- `test/escrow-settlement-ledger.test.js` - coverage for settlement decisions, route math, IP holds, and signatures.
- `docs/requirement-map.md` - issue #18 requirement mapping and non-overlap notes.
- `docs/demo.svg` and `docs/demo.gif` - short demo artifacts for review.
