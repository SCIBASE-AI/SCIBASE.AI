# Research Editor Authorship Governance

This module adds a focused real-time collaborative research editor slice for authorship, contribution, and submission approval governance. It is designed as a final submission gate for collaborative manuscripts.

## What it checks

- CRediT contribution role coverage
- Author approvals tied to the current manuscript hash
- Conflict-of-interest disclosure status
- Non-author contributors who edited content without acknowledgement
- Blocking comments and required suggestions that remain open
- Figure, table, and equation owner approvals
- Submission readiness actions and deterministic audit digest

## Run locally

```bash
npm run check
npm test
npm run demo
```

The sample data intentionally blocks submission because one author has not approved the current manuscript, a COI disclosure is missing, a non-author contributor is unresolved, and blocking editor review objects are still open.
