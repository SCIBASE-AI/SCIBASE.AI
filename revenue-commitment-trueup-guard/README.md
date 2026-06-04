# Revenue Commitment True-Up Guard

This module adds a synthetic, dependency-free release guard for enterprise annual
minimum commitments before a revenue true-up invoice is released.

It focuses on the Revenue Infrastructure issue slice that sits after usage
metering and before invoice release:

- annual or multi-month minimum commitment drawdown
- true-up amount reconciliation
- duplicate true-up window detection
- unsigned or out-of-period amendment impact
- SLA credit evidence and cap checks
- overage evidence before billing above the commitment

No credentials, payment processors, real customers, private billing data,
external APIs, or payout systems are used. All scenarios are synthetic fixtures.

## Run

```bash
node revenue-commitment-trueup-guard/test.js
node revenue-commitment-trueup-guard/demo.js
```

## Reviewer Artifacts

Running `demo.js` writes:

- `artifacts/demo-output.json`
- `artifacts/reviewer-report.md`
- `artifacts/trueup-risk-map.svg`
- `artifacts/commitment-trueup-guard-demo.mp4`

## Actions

- `RELEASE_INVOICE`: commitment, true-up, credits, and evidence are aligned.
- `REVIEW_BEFORE_RELEASE`: non-blocking finance review is needed.
- `HOLD_INVOICE`: invoice should not be released until a blocker is resolved.
