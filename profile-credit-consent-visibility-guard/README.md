# Profile Credit Consent Visibility Guard

This module adds a focused Community & User Reputation System guard for issue #15.
It evaluates whether CRediT contribution records, peer-review receipts, and
reputation deltas can safely appear on researcher profiles, citation pages,
leaderboards, or institutional exports.

The guard is intentionally narrow. It does not implement another broad
reputation ledger, endorsement-ring detector, badge gate, leaderboard gate,
review civility tool, recusal module, calibration bench, identity-leak-only
checker, or correction-impact ledger.

## What It Checks

- contributor profile-credit consent is active and not expired or revoked
- ORCID/profile identity is verified before public reputation deltas publish
- CRediT/review roles are accepted and evidence receipts are immutable
- anonymous or double-blind review credits remain redacted until release
- embargoed artifacts stay citation-only until the embargo date passes
- private or sensitive evidence is restricted to institutional export packets
- missing evidence blocks public profile and leaderboard updates

## Commands

```bash
npm run check
npm test
npm run demo
```

The demo writes deterministic reviewer artifacts to `reports/`:

- `summary.json`
- `reviewer-packet.md`
- `summary.svg`

The sample data is synthetic only. No private user, account, payout, profile, or
payment information is included.
