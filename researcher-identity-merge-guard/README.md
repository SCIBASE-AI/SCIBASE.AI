# Researcher Identity Merge Guard

This package is a focused SCIBASE community reputation slice for issue #15. It evaluates researcher identity consolidation packets before merged profiles can transfer reputation, CRediT-style contribution credit, badges, leaderboards, or private review history.

The guard is intentionally self-contained. It uses synthetic data only, has no external API calls, needs no credentials, and does not touch live profile systems.

## Why this fits Community and User Reputation

Community reputation systems often need to merge duplicated or renamed researcher identities: ORCID records, GitHub handles, institutional emails, legacy profile IDs, and project contribution ledgers. A naive merge can hijack credit, leak double-blind reviews, duplicate publication credit, or inflate reputation scores.

This guard produces deterministic reviewer decisions:

- `APPROVE_MERGE` when independent identity proofs, consent, redaction, steward approval, and audit receipts are all present.
- `REVIEW_MERGE` when evidence is plausible but stale or the projected credit transfer is unusually large.
- `HOLD_MERGE` when conflicting identity claims, open objections, privacy leaks, missing approvals, duplicate publication collisions, or missing audit receipts are present.

## Files

- `src/index.js` contains the decision engine.
- `data/sample-merge-packets.json` contains four synthetic profile merge packets.
- `test/identity-merge-guard.test.js` covers approve, review, hold, aggregate, and helper behavior.
- `scripts/demo.js` writes reviewer artifacts to `reports/`.
- `scripts/render-demo-video.js` renders the required short MP4 demo using a generated slate only.

## Local Validation

```powershell
npm run check
npm test
npm run demo
npm run video
```

Generated review artifacts:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

The MP4 is generated from synthetic text and color frames only. It does not capture the desktop, browser windows, keys, personal files, or private data.
