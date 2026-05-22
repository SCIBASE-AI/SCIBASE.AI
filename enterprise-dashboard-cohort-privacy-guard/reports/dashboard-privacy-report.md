# Enterprise Dashboard Cohort Privacy Report

Organization: Northbridge Research Institute
Widgets reviewed: 4
Rows reviewed: 8
Hold for privacy review: 1
Masked ready: 3
Suppressed rows: 1
Masked or rolled-up rows: 3
Blocked raw exports: 1
Audit digest: `a767494fae0607e1c2211dd5218888859ffd8eb7615b3a3bfc097c0c0797c3bb`

## Dashboard Decisions

### Contributor Activity Heatmap
- Status: hold_for_privacy_review
- Rows reviewed: 2
- Suppressed rows: 1
- Masked rows: 0
- Findings: small_cohort, named_contributor_reidentification, private_project_mask_required, direct_identifier_block, recent_activity_window, sensitive_tag_exposure
- Reviewer note: 1 row(s) are held because they fall below k=7 or expose direct identifiers.

### Cross-Lab Collaboration Index
- Status: masked_ready
- Rows reviewed: 2
- Suppressed rows: 0
- Masked rows: 1
- Findings: cross_lab_rollup_needed, private_project_mask_required
- Reviewer note: 1 row(s) need broader aggregation before dashboard release.

### Open Access Compliance
- Status: masked_ready
- Rows reviewed: 2
- Suppressed rows: 0
- Masked rows: 1
- Findings: department_rollup_too_narrow
- Reviewer note: 1 row(s) need broader aggregation before dashboard release.

### Storage and Compute Usage
- Status: masked_ready
- Rows reviewed: 2
- Suppressed rows: 0
- Masked rows: 1
- Findings: private_project_mask_required, sensitive_tag_exposure
- Reviewer note: 1 row(s) can be shown after project/lab labels and sensitive tags are masked.

## Admin Actions
- contributor-heatmap/heatmap-private-oncology: block_raw_export_and_rebuild_aggregate (small_cohort, named_contributor_reidentification, private_project_mask_required, direct_identifier_block, recent_activity_window, sensitive_tag_exposure)
- cross-lab-collaboration/collab-materials-bio: roll_up_before_release (cross_lab_rollup_needed, private_project_mask_required)
- compliance-open-access/oa-small-department: roll_up_before_release (department_rollup_too_narrow)
- storage-compute-usage/usage-invitation-only: mask_labels_before_release (private_project_mask_required, sensitive_tag_exposure)
