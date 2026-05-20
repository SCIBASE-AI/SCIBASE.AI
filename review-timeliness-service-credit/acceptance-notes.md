# Acceptance Notes

## Scope

Adds a focused review timeliness and service-credit guard for issue #15.

## Non-overlap

This module focuses on review-service timing and credit readiness, not:

- endorsement rings
- mentorship ladders
- correction-impact ledgers
- contributor attestation
- peer-review calibration
- reviewer COI assignment
- broad transparency receipt ledgers
- abuse/appeals workflows
- dataset reuse credit
- reproducibility badge renewal

## Validation

Run:

```bash
node review-timeliness-service-credit/test.js
node review-timeliness-service-credit/demo.js
```

Expected result:

- Tests print `review timeliness service-credit tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough of the generated service-credit packet.
