# Reviewer Panel Consensus Monitor

This module adds a focused Scientific Bounty System slice for third-party reviewer panel quality control. It helps sponsors and platform arbitrators decide whether a challenge submission is ready for phase advancement or reward action.

It evaluates:

- declared reviewer conflicts of interest
- independent reviewer coverage and expertise tags
- locked submission manifests and artifact hashes
- reviewer score variance against the rubric threshold
- missing reviewer feedback
- missing decision explanations or response deadlines

The output is an arbitration-ready packet with a deterministic digest, required actions, reviewer counts, the review phase, and a clear panel decision.

## Usage

```bash
node reviewer-panel-consensus-monitor/demo.js
```

```js
const { evaluateReviewerPanel } = require("./index.js");

const result = evaluateReviewerPanel({
  challengeTitle: "Climate Materials Prize",
  phase: "final award review",
  submission: {
    id: "sub-2026-088",
    teamId: "team-carbon",
    artifactHashes: ["sha256:model", "sha256:dataset", "sha256:report"],
    manifestLockedAt: "2026-05-18T16:40:00Z"
  },
  rubric: {
    version: "v3.0",
    criteria: ["scientific rigor", "reproducibility", "field impact"],
    decisionThreshold: 82,
    maxScoreVariance: 12
  },
  reviewers: [],
  decision: {}
});
```

## Verification

```bash
node reviewer-panel-consensus-monitor/test.js
node reviewer-panel-consensus-monitor/demo.js
```

The tests cover a blocked panel with conflicts and missing review controls, an approved panel with independent consensus, and arbitration-ready evidence/remediation fields for every finding.

## Demo

Short demo artifact: `demo.gif`

The demo uses synthetic data only. It does not call external services, use credentials, or move funds.
