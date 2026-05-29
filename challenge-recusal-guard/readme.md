# Challenge Conflict-of-Interest Recusal Guard

This module is a focused Scientific Bounty System slice for checking evaluator, sponsor, and institutional conflicts before challenge scoring or payout decisions.

It is intentionally separate from payout routing, team split ledgers, arbitration, review integrity, reviewer workload, challenge fairness, deadline fairness, evidence freeze, benchmark leakage, submission quarantine, package security, license risk, sponsor data-room access, and award transparency modules.

## What it checks

- Recent coauthorship between evaluator and submitter team
- Shared institutional affiliation requiring disclosure
- Sponsor employee involvement in payout scoring
- Material financial interest
- Competing-team evaluator membership
- Anonymous challenge identity exposure before scoring lock

## Run

```bash
node challenge-recusal-guard/test.js
node challenge-recusal-guard/demo.js
node challenge-recusal-guard/render-video.js
```

Outputs are written to `challenge-recusal-guard/reports/`.

## Safety

All data is synthetic. The module does not call payment providers, sponsors, reviewers, bounty platforms, private submissions, identity systems, credentials, or production SCIBASE services.
