# Acceptance Notes

## Scope

Adds holds scientific bounty deliverables that miss acceptance-window or evidence requirements for issue #18.

## Non-overlap

This slice avoids bounty payout eligibility, amendment control, challenge evidence freeze, rubric readiness, milestone progress, leaderboard integrity, prequalification, sponsor reliability, or IP redaction slices.

## Validation

```bash
node deliverable-acceptance-window-guard/test.js
node deliverable-acceptance-window-guard/demo.js
file deliverable-acceptance-window-guard/reports/demo.webm deliverable-acceptance-window-guard/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `deliverable-acceptance-window-guard tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
