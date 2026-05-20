# Anonymous Review Identity Leak Guard

This focused slice adds detects identity leakage before anonymous peer reviews affect reputation for issue #15.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node anonymous-review-identity-leak-guard/test.js
node anonymous-review-identity-leak-guard/demo.js
```

Generated outputs are written to `anonymous-review-identity-leak-guard/reports/`.

## Why this is distinct

This does not duplicate broad reputation ledger, endorsement ring, mentorship ladder, correction impact, credit attestation, peer-review calibration, reviewer COI, transparency receipt, abuse/appeals, dataset reuse, reproducibility badge, or review-timeliness slices. It focuses specifically on detects identity leakage before anonymous peer reviews affect reputation.
