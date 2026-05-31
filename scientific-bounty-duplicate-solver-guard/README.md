# Scientific Bounty Duplicate Solver Guard

This is a self-contained Scientific Bounty System slice for issue #18.

The guard checks whether challenge submissions are independent enough to proceed to sponsor scoring and payout routing. It detects repeated solver identities, repeated teams, reused payment routes, copied artifact hashes, and unusually similar submission summaries before arbitration decisions are made.

## Scope

- Synthetic data only.
- No network calls, credentials, payment provider integration, identity provider integration, or SCIBASE production service integration.
- Focused on duplicate-solver and duplicate-submission risk, not broad challenge posting, submission package security, license review, payout routing, prequalification fairness, scope-change control, recusal, or submission quarantine.

## Validation

```sh
node scientific-bounty-duplicate-solver-guard/test.js
node scientific-bounty-duplicate-solver-guard/demo.js
```

The demo writes deterministic reviewer artifacts under `scientific-bounty-duplicate-solver-guard/reports/`.

Reviewer artifacts:

- `reports/duplicate-solver-packet.json`
- `reports/duplicate-solver-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`
