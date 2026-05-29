# Scientific Bounty Submission Quarantine Guard

This module adds a focused quarantine layer for the Scientific Bounty System. It decides whether solver submissions are safe and complete enough to reach reviewers or sponsors.

It is intentionally separate from challenge intake, scoring and arbitration, payout routing, evidence freeze, anonymous review packets, prequalification, data-use agreements, closeout, reviewer workload, deadline fairness, and package security scanning. This guard handles submission quarantine and sponsor-visibility gating.

## What It Checks

- Package manifest completeness
- Artifact hash coverage
- Unsafe artifact flags such as executable binaries or macro-enabled documents
- Sponsor visibility before clearance
- Reviewer-safe preview availability
- IP handoff statement presence

## Demo

Run:

```bash
node bounty-submission-quarantine-guard/test.js
node bounty-submission-quarantine-guard/demo.js
node bounty-submission-quarantine-guard/render-video.js
```

Generated artifacts:

- `reports/submission-quarantine-report.json`
- `reports/submission-quarantine-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not execute solver files, call storage providers, expose sponsor data, process payment details, use credentials, or contact SCIBASE production services.
