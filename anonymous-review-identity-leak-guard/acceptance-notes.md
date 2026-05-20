# Acceptance Notes

## Scope

Adds detects identity leakage before anonymous peer reviews affect reputation for issue #15.

## Non-overlap

This slice avoids broad reputation ledger, endorsement ring, mentorship ladder, correction impact, credit attestation, peer-review calibration, reviewer COI, transparency receipt, abuse/appeals, dataset reuse, reproducibility badge, or review-timeliness slices.

## Validation

```bash
node anonymous-review-identity-leak-guard/test.js
node anonymous-review-identity-leak-guard/demo.js
file anonymous-review-identity-leak-guard/reports/demo.webm anonymous-review-identity-leak-guard/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `anonymous-review-identity-leak-guard tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
