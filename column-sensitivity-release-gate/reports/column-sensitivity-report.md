# Column Sensitivity Release Gate Report

Datasets reviewed: 3
Ready datasets: 1
Review datasets: 1
Blocked datasets: 1
Columns reviewed: 15
Sensitive columns: 15
Critical findings: 4
Warning findings: 3
Audit digest: `81ec569e7857229841a0d8706644430bedef984ebef8fba631d5f3744d40f694`

## Dataset Decisions

### Metabolomics Public Release
- Status: release_ready
- Columns: 5
- Sensitive columns: 5
- Finding codes: none

### Clinical Screening Export
- Status: release_blocked
- Columns: 6
- Sensitive columns: 6
- Finding codes: direct_identifiers_transformed, quasi_identifier_k_anonymity_met, free_text_review_attested, location_precision_safe, data_steward_approval_present, public_sensitive_column_budget

### Survey Free Text Review
- Status: release_review
- Columns: 4
- Sensitive columns: 4
- Finding codes: free_text_review_attested

## Hold Queue
- clinical-screening-export: block_release_until_sensitivity_fixed (direct_identifiers_transformed, quasi_identifier_k_anonymity_met, free_text_review_attested, location_precision_safe, data_steward_approval_present, public_sensitive_column_budget)
- survey-free-text-review: defer_release_for_review (free_text_review_attested)
