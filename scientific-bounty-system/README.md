# SCIBASE.AI Scientific Bounty System

Self-contained implementation for issue #18. The module turns SCIBASE into a research challenge marketplace with sponsor-funded prizes, standardized submissions, arbitration, and payout routing.

## What is included

- Challenge posting data model with scientific context, visibility, NDA flag, IP terms, milestones, and rubrics
- R&D templates across biotech, climate, ML, materials, chemistry, and quantum domains
- Submission package builder with artifact hashes, reproducibility commands, audit logs, and team payout shares
- Automated arbitration using weighted reviewer criteria and package-validity checks
- Escrow validation to ensure prize funds are available before a challenge is accepted
- Payout routing across solver team members with release conditions and IP-transfer handling
- Sponsor dashboard UI plus JSON APIs for challenge review, arbitration, and payout previews
- Tests for challenge validation, manifest creation, scoring, arbitration, incomplete-package rejection, payout splitting, and service workflows

## Run locally

```bash
cd scientific-bounty-system
npm install
npm run dev
```

Open `http://localhost:3001`.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Demo API

Sponsor dashboard:

```bash
curl -s http://localhost:3001/api/dashboard | jq .
```

Run arbitration:

```bash
curl -s http://localhost:3001/api/arbitration/challenge_biomarker_rna | jq .
```

Build payout instructions:

```bash
curl -s http://localhost:3001/api/payouts \
  -H 'content-type: application/json' \
  -d '{"challengeId":"challenge_biomarker_rna"}' | jq .
```

## Demo artifact

- `docs/demo/dashboard.png`
- `docs/demo/scientific-bounty-system-demo.mp4`

The MP4 is intentionally small so it can be linked directly from a pull request while still showing the runnable sponsor dashboard.

## Production integration notes

The module isolates the risky workflows behind explicit service methods:

- `validateChallenge` prevents underfunded or malformed challenges from opening.
- `createSubmissionManifest` records artifact hashes, reproducibility commands, and team payout splits.
- `arbitrateChallenge` ranks submissions using the challenge rubric, then checks the winning package before payout.
- `buildPayoutInstruction` maps solver shares to payout routes and release conditions, including IP assignment when required.

Recommended production follow-ups:

- Persist challenges, submissions, reviews, escrow records, and payouts in the SCIBASE database.
- Connect escrow state to Stripe Treasury, bank partner APIs, or institutional invoice reconciliation.
- Add sponsor/reviewer authentication and immutable audit logs.
- Add file scanning, malware checks, and sandboxed reproducibility execution before arbitration approval.
