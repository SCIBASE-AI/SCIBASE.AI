# Reputation Probation Reinstatement Guard

Policy: community-reputation-probation-2026
Status: HOLD
Fingerprint: efef8995221f8246

## Summary

Reputation reinstatement is hold with 2 critical, 7 high, and 4 warning finding(s).

## Decisions

- researcher-beta: HOLD, reputation accrual paused
- researcher-gamma: HOLD, reputation accrual eligible

## Findings

- CRITICAL PROBATION_WINDOW_ACTIVE: researcher-beta is still inside the minimum probation window.
  - Remediation: Wait until 2026-06-19T12:00:00.000Z before reinstatement review.
- CRITICAL REPUTATION_DELTA_DURING_PROBATION: researcher-beta received 2 reputation delta(s) during probation.
  - Remediation: Reverse or quarantine probation-window reputation deltas before reinstatement.
- HIGH OPEN_APPEAL_BLOCKS_REINSTATEMENT: researcher-beta has an unresolved appeal tied to the probation record.
  - Remediation: Resolve the appeal or keep reputation accrual paused.
- HIGH PROBATION_RECORD_INCOMPLETE: researcher-gamma has an incomplete probation record.
  - Remediation: Attach reason code, start timestamp, and moderation receipt.
- HIGH REINSTATEMENT_REQUEST_MISSING: researcher-gamma has no reinstatement request timestamp.
  - Remediation: Record a reinstatement request and reviewer packet.
- HIGH REINSTATEMENT_REVIEW_QUORUM_MISSING: researcher-beta lacks the required reinstatement reviewer quorum.
  - Remediation: Add independent moderator approvals before re-entry.
- HIGH REINSTATEMENT_REVIEW_QUORUM_MISSING: researcher-gamma lacks the required reinstatement reviewer quorum.
  - Remediation: Add independent moderator approvals before re-entry.
- HIGH REMEDIATION_ACTIONS_INCOMPLETE: researcher-beta has not completed required remediation action(s): updated-profile-attestation.
  - Remediation: Complete and attach evidence for all required remediation actions.
- HIGH REMEDIATION_ACTIONS_INCOMPLETE: researcher-gamma has not completed required remediation action(s): moderation-acknowledgement, updated-profile-attestation.
  - Remediation: Complete and attach evidence for all required remediation actions.
- WARNING REENTRY_SCORE_CAP_TOO_HIGH: researcher-beta re-entry score cap is above policy.
  - Remediation: Apply the policy score cap until the post-reinstatement review window closes.
- WARNING REENTRY_SCORE_CAP_TOO_HIGH: researcher-gamma re-entry score cap is above policy.
  - Remediation: Apply the policy score cap until the post-reinstatement review window closes.
- WARNING REINSTATEMENT_SUMMARY_VISIBILITY_UNSAFE: researcher-beta reinstatement summary is not configured for public-redacted visibility.
  - Remediation: Publish a redacted reinstatement receipt and keep private evidence internal.
- WARNING REINSTATEMENT_SUMMARY_VISIBILITY_UNSAFE: researcher-gamma reinstatement summary is not configured for public-redacted visibility.
  - Remediation: Publish a redacted reinstatement receipt and keep private evidence internal.
