# Challenge Rubric Readiness Gate

This module covers a narrow Challenge Posting Portal slice of SCIBASE issue #18.

It evaluates whether a scientific bounty is ready to publish before solvers spend time on it. The gate checks challenge context, deliverables, scoring rubric, timeline, prize reconciliation, payout triggers, private/NDA handling, submission privacy, and IP policy.

## What It Does

- Verifies required challenge posting fields.
- Ensures deliverables have acceptance evidence and unique IDs.
- Checks that rubric criteria are measurable and total 100 points.
- Confirms timeline dates are valid and chronological.
- Reconciles payout milestones against the prize amount.
- Flags NDA, prequalification, privacy, sponsor contact, and IP policy gaps.
- Emits readiness status, blockers, warnings, recommended actions, and an audit digest.

## Run

```bash
node challenge-rubric-readiness-gate/test.js
node challenge-rubric-readiness-gate/demo.js
```
