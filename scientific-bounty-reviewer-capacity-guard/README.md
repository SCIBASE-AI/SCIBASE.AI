# Scientific bounty reviewer capacity guard

This module checks whether a scientific bounty has enough qualified, available reviewers before a review panel is assigned.

It focuses on one slice of the bounty workflow: reviewer capacity. It does not handle payouts, arbitration, escrow, IP transfer, or export control.

## What it checks

- enough eligible reviewers
- required expertise coverage
- reviewer conflicts
- overloaded reviewers
- stale reviewer training

## Run it

```bash
node scientific-bounty-reviewer-capacity-guard/test.js
node scientific-bounty-reviewer-capacity-guard/demo.js
```

The demo writes a JSON result and Markdown report to `artifacts/`.
