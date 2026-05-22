# Enterprise LMS Roster Passback Guard Report

Sync: sync-canvas-biology
Institution: North Valley University
Generated: 2026-05-22T14:40:00Z
Decision: block-sync
Sync readiness score: 60

## Summary

Roster entries: 2
Passback events: 0
Webhook receipts: 1
Approved sections: 2
Findings: 1

## Findings

- critical: out-of-scope-section - u-ben is enrolled in unapproved section CHEM-999-Z

## Required Actions

- remove_out_of_scope_enrollment: u-ben (LMS sync must stay inside approved institutional course sections)

---
# Enterprise LMS Roster Passback Guard Report

Sync: sync-moodle-physics
Institution: North Valley University
Generated: 2026-05-22T14:40:00Z
Decision: needs-admin-review
Sync readiness score: 60

## Summary

Roster entries: 2
Passback events: 0
Webhook receipts: 1
Approved sections: 1
Findings: 2

## Findings

- major: stale-dropped-enrollment - u-clio has stale dropped enrollment state from 2026-05-01T00:00:00Z
- major: missing-orcid-linkage - u-drew lacks ORCID/profile linkage for enterprise reporting

## Required Actions

- confirm_dropped_enrollment: u-clio (stale dropped students need admin confirmation before roster sync)
- link_orcid_profile: u-drew (enterprise reporting needs stable researcher identity linkage)

---
# Enterprise LMS Roster Passback Guard Report

Sync: sync-grade-passback
Institution: North Valley University
Generated: 2026-05-22T14:40:00Z
Decision: hold-passback
Sync readiness score: 60

## Summary

Roster entries: 1
Passback events: 2
Webhook receipts: 1
Approved sections: 1
Findings: 2

## Findings

- major: grade-release-window-violation - grade-1 released outside configured grade window
- major: missing-webhook-acknowledgement - grade-2 lacks acknowledged LMS webhook receipt

## Required Actions

- hold_grade_passback: grade-1 (grade releases must occur inside the approved LMS release window)
- replay_or_confirm_webhook: grade-2 (grade passback must have an acknowledged LMS webhook receipt)

---
# Enterprise LMS Roster Passback Guard Report

Sync: sync-clean-lms
Institution: North Valley University
Generated: 2026-05-22T14:40:00Z
Decision: approve-sync
Sync readiness score: 100

## Summary

Roster entries: 2
Passback events: 1
Webhook receipts: 2
Approved sections: 1
Findings: 0

## Findings

- None

## Required Actions

- None
