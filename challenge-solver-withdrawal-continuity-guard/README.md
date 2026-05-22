# Solver Withdrawal Continuity Guard

Self-contained Scientific Bounty System slice for issue #18. It evaluates active solver/team withdrawals or replacements after a private challenge workspace has opened, before milestone review, sponsor scoring, payout, or IP handoff continues.

## What It Checks

- Dated withdrawal notice records.
- Workspace access revocation after a solver leaves.
- Solver IP return, retention, or destruction confirmation.
- Team quorum and eligible replacement readiness.
- Artifact custody for work owned by withdrawing solvers.
- Near-term milestone risk after team membership changes.
- Sponsor and reviewer notification coverage.

## Outputs

- `reports/withdrawal-continuity-packet.json`: structured decisions, findings, summaries, and actions.
- `reports/coordinator-packet.md`: readable challenge coordinator packet.
- `reports/summary.svg`: visual decision summary.
- `reports/demo.mp4`: short demo artifact for Algora review.

## Local Verification

```bash
node --test challenge-solver-withdrawal-continuity-guard/test.js
node challenge-solver-withdrawal-continuity-guard/demo.js
node --check challenge-solver-withdrawal-continuity-guard/index.js
node --check challenge-solver-withdrawal-continuity-guard/sample-data.js
node --check challenge-solver-withdrawal-continuity-guard/demo.js
node --check challenge-solver-withdrawal-continuity-guard/test.js
```

The module is dependency-free, uses synthetic data only, and makes no network calls. Set `FFMPEG_PATH` to an ffmpeg binary before running `demo.js` if regenerating `reports/demo.mp4`.
