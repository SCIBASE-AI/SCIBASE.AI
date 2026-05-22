# Peer Review Recusal Steward Packet

Project: Neural graph biomarkers for early intervention response
Generated: 2026-05-22T03:00:00.000Z
Packet digest: 3fad477b686abbaba68bd81c5140c2290ea013644782c632a20c2c2f2936680f

## Summary

- Assignments evaluated: 5
- Allowed: 1
- Steward review: 1
- Recused: 3
- Reputation weight at risk: 92%

## Decisions

### assign-lina - allow

- Reviewer: reviewer-aa720145
- Review type: methods_reproducibility
- Mode: double_blind
- Severity: low
- Risk score: 16
- Public impact: profile_and_project
- Blockers: none
- Warnings: relationship:prior_public_comment, public_reputation_surface
- Audit digest: cb756061b9d85adc0df6efc2361ae849a576245173302c616bc0d5b7d6a98f56

Evidence:
- prior_public_comment with user-cora: low; Prior public methods question on an earlier project version.

### assign-mateo - recuse

- Reviewer: reviewer-565c1d0e
- Review type: technical_rigor
- Mode: double_blind
- Severity: critical
- Risk score: 118
- Public impact: profile_and_leaderboard
- Blockers: hard_conflict:same_lab, hard_conflict:mentor_student
- Warnings: blind_review_institution_overlap, high_reputation_weight, public_reputation_surface
- Audit digest: ea3c8c0a00aea4991dd7518293dc2875d6399abb31f60715ca113afe63e76098

Evidence:
- same_lab with user-ada: critical; Current lab roster places reviewer and author in lab-graph-neuro.
- mentor_student with user-cora: critical; Reviewer is listed as project methods mentor.

### assign-nadia - steward_review

- Reviewer: reviewer-75c8fcbd
- Review type: statistical_methods
- Mode: public
- Severity: medium
- Risk score: 36
- Public impact: profile_only
- Blockers: none
- Warnings: conflict_disclosure_stale, relationship:coauthorship
- Audit digest: da63a9b6a2979d9e7adfe7b7dea23076538b8fa2f0671178a3766ced44918124

Evidence:
- coauthorship with user-ben: high; Shared preprint DOI 10.5555/neuro.2025.14.

### assign-oscar - recuse

- Reviewer: reviewer-0b08c827
- Review type: clinical_translation
- Mode: double_blind
- Severity: critical
- Risk score: 78
- Public impact: profile_and_project
- Blockers: hard_conflict:shared_grant
- Warnings: relationship:shared_institution, high_reputation_weight, public_reputation_surface
- Audit digest: 8ee165ac39c58d0a7842e11af8facee63374f0c8d37e704b043c934abfa75068

Evidence:
- shared_institution with user-ben: medium; Same institution for double-blind review.
- shared_grant with user-ben: critical; Both are named personnel on grant-ninds-2214.

### assign-priya - recuse

- Reviewer: reviewer-64152af5
- Review type: domain_review
- Mode: public
- Severity: critical
- Risk score: 68
- Public impact: profile_only
- Blockers: reviewer_inactive
- Warnings: reviewer_history_thin, calibration_below_threshold, conflict_disclosure_stale
- Audit digest: 0bfffca9bfede4687ed414acd900d266c0965eec3850306fedaa04896a5ea131

## Steward Queue

- critical: replace_reviewer for assign-mateo
- medium: steward_review_required for assign-nadia
- critical: replace_reviewer for assign-oscar
- critical: replace_reviewer for assign-priya
