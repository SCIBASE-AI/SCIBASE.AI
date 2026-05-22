# Project Break-Glass Access Guard

This module provides a focused User & Project Management slice for SCIBASE issue
#11. It evaluates emergency break-glass access requests for locked or
time-sensitive scientific workspaces before temporary owner/admin access is
granted.

## What It Covers

- Owner/admin emergency access requests for locked project spaces.
- Reason-code and reason-detail requirements.
- Fresh MFA gates for sensitive temporary access.
- Least-privilege object scopes with short expiry windows.
- Protected data-class review holds.
- Sponsor approval or after-hours justification.
- Immutable audit receipts and mandatory post-access review.

## Run

```bash
npm run check
npm test
npm run demo
```

Generated artifacts are written to `reports/`:

- `summary.json`
- `reviewer-packet.md`
- `summary.svg`
- `demo.mp4`

All data is synthetic and does not touch real identity providers, user accounts,
project permissions, or production workspaces.
