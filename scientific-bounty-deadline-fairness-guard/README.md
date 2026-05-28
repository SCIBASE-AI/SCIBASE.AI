# Scientific Bounty Deadline Fairness Guard

Focused slice for SCIBASE issue #18, Scientific Bounty System.

This module evaluates deadline extensions, timezone cutoffs, late submissions, and solver notice parity before a scientific bounty challenge proceeds to arbitration or award release. It is intentionally narrower than general intake, scoring, payout routing, evidence freeze, anonymous review packets, or post-closeout retention.

## What it checks

- Challenge deadlines are timezone-explicit and normalized before submission decisions are made.
- Sponsor deadline extensions are approved, published, and scoped to all eligible solver teams.
- Every eligible team receives the same new deadline inside the configured notice SLA.
- Submissions received after the original deadline are accepted only when a valid public extension covers them.
- Submissions received after the current deadline are rejected or held for arbitration if they were accepted.
- Evidence-freeze windows are reopened with a new snapshot instead of mutating the original frozen record.

## Local verification

```bash
node scientific-bounty-deadline-fairness-guard/test.js
node scientific-bounty-deadline-fairness-guard/demo.js
node scientific-bounty-deadline-fairness-guard/make-demo-video.js
```

Generated reviewer artifacts are written to `scientific-bounty-deadline-fairness-guard/reports/`.

## Safety

The fixtures are synthetic. The module does not call payment processors, use private challenge data, touch credentials, or perform any external write action.
