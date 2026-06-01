# Reputation Sybil Cluster Guard

This slice adds a dependency-free guard for SCIBASE's Community & User Reputation System. It audits synthetic reputation events for sybil-cluster patterns before points affect leaderboards, bounty eligibility, trust badges, or payout review.

The scope is distinct from existing submissions for probation reinstatement, leaderboard eligibility/privacy, reputation review abuse, identity impersonation, badge renewal, credit-ledger reputation, and completion reputation.

## What It Checks

- Shared payout handles across multiple accounts.
- Recycled device fingerprints across high-velocity accounts.
- Burst endorsements shortly after signup.
- Suspicious invitation chains.
- Cross-project high-score review rings.
- High reputation deltas while risk signals are present.
- Missing quarantine, leaderboard suppression, payout pause, or manual review controls.

## Reviewer Output

Running the demo creates:

- `reports/sybil-cluster-report.json`
- `reports/sybil-cluster-report.md`
- `reports/summary.svg`
- `reports/demo-script.txt`
- `reports/demo.mp4`

All data is synthetic. The guard uses no credentials, private user records, payment processors, wallets, social media accounts, or external services.

## Commands

```bash
npm test
npm run demo
npm run demo:video
```
