# Acceptance Notes

## Reviewer perspective

The bounty asks for a community and user reputation system, not just score aggregation. A reviewer conflict and recusal gate is a necessary control because peer reviews, comments, badges, and reputation scores become low-trust if conflicted reviews can be credited without screening.

## Non-overlap audit

Existing public PR titles and issue comments for #15 include broad community ledgers, reputation badges, leaderboards, civility checks, review calibration, endorsement-ring detection, appeal guardrails, mentorship impact, timeliness credits, and correction ledgers.

This implementation is different: it screens individual review assignments before they are released or credited, routes conflicted reviewers to recusal/steward review, and emits anonymized evidence packets suitable for blind-review workflows.

## Scope boundary

This does not implement the full reputation system, public profile UI, leaderboard rendering, or appeal workflow. It adds the upstream governance control that protects those systems from conflicted review inputs.
