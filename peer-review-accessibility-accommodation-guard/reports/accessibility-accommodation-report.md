# Peer Review Accessibility Accommodation Guard Report

Review packet: community-reputation-accessibility-demo
Generated at: 2026-05-23T08:30:00Z
Decision: hold-for-accessibility-review
Fairness score: 0
Findings: 7
Required actions: 7
Audit digest: 4d1c204c07ce84e5

## Summary

- Events reviewed: 4
- Accommodation events: 3
- Missing accessible artifacts: 1
- Deadline issues: 1
- Privacy holds: 1
- Locale/window issues: 2
- Reputation penalties held: 2

## Findings

- blocker: missing-accessible-artifact on review-late-accessibility - Approved accommodation requires dataset_summary, but it is not available.
- blocker: missing-adjusted-deadline on review-late-accessibility - Extended-deadline accommodation was approved without an adjusted deadline.
- blocker: unfair-reputation-penalty on review-late-accessibility - Negative reputation delta -8 is held until accessibility and locale issues are resolved.
- major: unsafe-accommodation-disclosure on review-disclosure-risk - Accommodation details are visible in an anonymous review context.
- major: insufficient-local-response-window on review-locale-window - Reviewer response window is 3.0 hours, below required 24 hours.
- major: missing-translation-support on review-locale-window - Reviewer requires vi support, but no translated abstract was provided.
- blocker: unfair-reputation-penalty on review-locale-window - Negative reputation delta -4 is held until accessibility and locale issues are resolved.

## Required Actions

- publish_accessible_artifact for review-late-accessibility (review_steward)
- record_adjusted_deadline for review-late-accessibility (review_steward)
- freeze_reputation_penalty for review-late-accessibility (reputation_steward)
- redact_accommodation_disclosure for review-disclosure-risk (privacy_steward)
- extend_response_window for review-locale-window (review_coordinator)
- provide_translated_abstract for review-locale-window (review_coordinator)
- freeze_reputation_penalty for review-locale-window (reputation_steward)
