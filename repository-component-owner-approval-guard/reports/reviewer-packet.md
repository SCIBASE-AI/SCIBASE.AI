# Repository Component Owner Approval Guard

Generated: 2026-05-22T19:30:00.000Z

## Summary

- Total merge requests: 4
- Approved: 2
- Require owner review: 0
- Blocked: 2

## Merge Request Decisions

### MR-2401: Refresh methods text and analysis notebook

- Decision: approve-merge
- Score: 100
- Components: manuscript, notebooks, results
- Findings: none

### MR-2417: Publish restricted participant table with updated protocol

- Decision: block-merge
- Score: 0
- Components: data, protocols, metadata
- Findings:
  - critical: required-owner-role-missing - data is missing restricted-change escalation owner approval(s).
  - critical: approval-quorum-missing - protocols requires 1 eligible owner approval(s).
  - critical: required-owner-role-missing - protocols is missing restricted-change escalation owner approval(s).
  - critical: conflicted-self-approval - protocols includes approval from a merge request author.

### MR-2422: Retag code package after model output changes

- Decision: block-merge
- Score: 0
- Components: code, results, metadata
- Findings:
  - critical: approval-quorum-missing - code requires 1 eligible owner approval(s).
  - critical: stale-approval-after-change - code has approval(s) older than the latest changed file timestamp.
  - critical: approval-quorum-missing - results requires 1 eligible owner approval(s).
  - critical: stale-approval-after-change - results has approval(s) older than the latest changed file timestamp.

### MR-2430: Release curated dataset and citation metadata

- Decision: approve-merge
- Score: 100
- Components: data, metadata, manuscript
- Findings: none
