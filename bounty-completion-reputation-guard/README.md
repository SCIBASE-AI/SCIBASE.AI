# Scientific Bounty Completion Reputation Guard

Self-contained Community and User Reputation slice for SCIBASE issue #15. It validates scientific bounty and challenge outcomes before they update researcher reputation, badges, leaderboards, or citation pages.

## What It Checks

- Sponsor acceptance evidence.
- Prize settlement and payment receipt status.
- Open appeal or arbitration holds.
- IP and public-release finality.
- Immutable deliverable and evaluation receipts.
- Team split attribution and invalid share ranges.
- Duplicate completion credit keys.
- Transparent final, provisional, or blocked reputation deltas.

## Why This Fits Issue #15

- Reputation scoring: converts challenge performance into transparent reputation deltas.
- Scientific bounty completions: gates challenge outcomes before they affect profile reputation.
- Contributor credits: allocates team credit using split evidence.
- Badges and leaderboards: blocks unsafe final credit from inflating public rankings.
- Project timelines and citation pages: requires durable receipts before public completion credit.

## Run

```bash
node bounty-completion-reputation-guard/test.js
node bounty-completion-reputation-guard/demo.js
node bounty-completion-reputation-guard/make-demo-video.js
```

Generated artifacts are written to `bounty-completion-reputation-guard/reports/`.

## Safety

The module uses synthetic data only. It does not call external bounty platforms, payment processors, identity providers, private repositories, or live reputation systems.
