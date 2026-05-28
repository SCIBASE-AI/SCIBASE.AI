# Team Payout Split Ledger

This slice supports issue #18, Scientific Bounty System. It adds a deterministic
ledger for allocating accepted scientific bounty awards across teams,
institutions, and milestone deliverables.

The module uses synthetic challenge data only. It does not process payment
credentials, identity documents, tax records, or banking details. Instead, it
tracks privacy-safe payout route states such as `verified`, `pending`, and
`blocked`.

## Checks

- Locked milestones cannot release money until accepted.
- Contributor splits must total 10000 basis points.
- Institution overhead is capped per challenge policy.
- Every contributor must keep a minimum solver share after overhead.
- Payout routes must be verified before the release is marked payable.
- Generated receipts preserve the award basis, hold reasons, and next actions.

## Local Verification

```bash
node scientific-bounty-system/team-payout-split-ledger/test.js
node scientific-bounty-system/team-payout-split-ledger/demo.js
git diff --check
```

The demo writes deterministic artifacts under
`scientific-bounty-system/team-payout-split-ledger/artifacts/`.

## Files

- `ledger.js` - allocation, policy checks, and receipt generation.
- `data/challenges.json` - synthetic bounty challenge packets.
- `test.js` - Node built-in tests.
- `demo.js` - deterministic JSON, Markdown, and SVG artifact generation.
