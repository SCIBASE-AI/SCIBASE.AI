# Requirement Map

This module targets SCIBASE issue #18, with a focus on the secure submission workspace and privacy controls that sit between challenge posting and final arbitration.

| Issue #18 Capability | Implementation |
| --- | --- |
| Challenge posting fields for public/private mode, NDA, timelines, deliverables, and IP terms | `data/sample-workspaces.json` challenge record plus package manifest challenge metadata. |
| Pre-qualification rounds | `evaluatePrequalification()` checks domain fit, institution type, NDA status, and required conflict disclosures. |
| Secure private project spaces for each submission team | Workspace model includes team participation mode, members, artifacts, reviewers, and audit events. |
| Anonymous or named participation | `buildSubmissionPackage()` redacts member names and team identity when anonymous submissions are enabled. |
| Submission package builder | `buildSubmissionPackage()` emits deliverables, artifact hashes, access summary, blockers, warnings, audit digest, and package digest. |
| Version control and audit logs for reproducibility | Artifact SHA-256 digests plus deterministic audit-event digest. |
| Sponsor/reviewer/arbitrator access boundaries | `decideWorkspaceAccess()` gates confidential artifacts by role, evaluation time, payout state, and dispute state. |
| Arbitration-ready evidence | Reviewer conflict detection, privacy blockers, access summaries, and artifact hashes are included in the exported manifest. |
| Payout and IP safety | Confidential artifact release remains blocked until payout is paid, matching `solver-retains-until-paid`. |
| Standardized evaluation dashboard inputs | `summarizePortfolio()` produces ready/hold counts, blocker counts, artifact counts, package digests, and a portfolio digest. |

## Reviewer Commands

```bash
npm run check
npm test
npm run demo
```

The sample data intentionally includes one ready workspace and one held workspace so reviewers can see both the successful and blocked paths.
