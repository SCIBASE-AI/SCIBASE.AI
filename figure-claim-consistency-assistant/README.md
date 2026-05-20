# Figure Claim Consistency Assistant

This module is a focused slice for SCIBASE.AI issue #16, AI-Powered Research Assistant Suite.

It acts as a pre-submission assistant for manuscript figures and tables. It cross-checks manuscript claims against synthetic figure and table metadata, then emits reviewer-ready tasks when visual evidence does not support the written claim.

## What It Covers

- Claim-to-figure and claim-to-table linkage.
- Axis unit, effect direction, effect magnitude, and sample-size consistency.
- Caption caveat propagation into manuscript claims.
- Public reproducibility artifact checks for source data, notebooks, benchmark logs, manifests, and deployment plans.
- Reviewer tasks, research-gap signals, JSON audit packets, Markdown review packets, SVG summaries, and a short MP4 demo artifact.

The sample data is synthetic. The module is dependency-free and does not call external services.

## Run

```bash
node figure-claim-consistency-assistant/test.js
node figure-claim-consistency-assistant/demo.js
```

Demo output is written to:

- `reports/claim-consistency-audit.json`
- `reports/review-packet.md`
- `reports/claim-consistency.svg`
- `reports/demo.mp4`
