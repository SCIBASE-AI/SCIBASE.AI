# Enterprise LMS Roster Passback Guard

Self-contained Enterprise Tooling slice for issue #19. It validates Canvas/Moodle roster and grade-passback sync evidence before an institution enables LMS integration events.

## What It Checks

- Course-section enrollment stays inside approved enterprise sync scope.
- Dropped enrollment state is fresh enough for roster export.
- ORCID/profile linkage exists for enterprise reporting.
- Student roster sync consent is present before FERPA-sensitive data moves.
- Grade passback events occur inside the approved release window.
- Grade and roster events have acknowledged webhook receipts.

## Outputs

- `reports/lms-sync-packet.json`: structured reviewer decisions and findings.
- `reports/lms-sync-report.md`: readable report for each synthetic LMS sync scenario.
- `reports/summary.svg`: visual summary of approve, review, hold, and block decisions.
- `reports/demo.mp4`: short demo artifact for Algora review.

## Local Verification

```bash
node enterprise-lms-roster-passback-guard/test.js
node enterprise-lms-roster-passback-guard/demo.js
node --check enterprise-lms-roster-passback-guard/index.js
node --check enterprise-lms-roster-passback-guard/test.js
node --check enterprise-lms-roster-passback-guard/demo.js
node --check enterprise-lms-roster-passback-guard/sample-data.js
```

The module is dependency-free, uses synthetic data only, and makes no network calls.
